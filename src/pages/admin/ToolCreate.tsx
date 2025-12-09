import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ToolFormSchema, ToolFormValues, defaultToolFormValues, CONTROLLED_VOCABULARIES } from '@/schemas/tool-form.schema';
import { useCreateTool, useUpdateTool, useToolAdmin, useVocabularies } from '@/hooks/api/useToolsAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

// Type for array fields that can be toggled
type ArrayFieldKeys = 'categories' | 'industries' | 'userTypes' | 'interface' | 'functionality' | 'deployment';

export default function ToolCreate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const { data: existingTool, isLoading: isLoadingTool } = useToolAdmin(id || '');
  const { data: vocabularies } = useVocabularies();

  // Use vocabularies from API or fallback to local
  const categories = vocabularies?.categories || CONTROLLED_VOCABULARIES.categories;
  const industries = vocabularies?.industries || CONTROLLED_VOCABULARIES.industries;
  const userTypes = vocabularies?.userTypes || CONTROLLED_VOCABULARIES.userTypes;
  const interfaceOptions = vocabularies?.interface || CONTROLLED_VOCABULARIES.interface;
  const functionalityOptions = vocabularies?.functionality || CONTROLLED_VOCABULARIES.functionality;
  const deploymentOptions = vocabularies?.deployment || CONTROLLED_VOCABULARIES.deployment;

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(ToolFormSchema),
    defaultValues: defaultToolFormValues,
  });

  // Populate form with existing tool data when editing
  useEffect(() => {
    if (isEditMode && existingTool) {
      form.reset({
        id: existingTool.id,
        name: existingTool.name,
        description: existingTool.description,
        tagline: existingTool.tagline || '',
        longDescription: existingTool.longDescription || '',
        categories: existingTool.categories || [],
        industries: existingTool.industries || [],
        userTypes: existingTool.userTypes || [],
        pricing: existingTool.pricing || [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }],
        pricingModel: existingTool.pricingModel || [],
        pricingUrl: existingTool.pricingUrl || '',
        interface: existingTool.interface || [],
        functionality: existingTool.functionality || [],
        deployment: existingTool.deployment || [],
        logoUrl: existingTool.logoUrl || '',
        website: existingTool.website || '',
        documentation: existingTool.documentation || '',
        status: existingTool.status || 'active',
        contributor: existingTool.contributor || '',
      });
    }
  }, [isEditMode, existingTool, form]);

  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({
    control: form.control,
    name: 'pricing',
  });

  const onSubmit = async (data: ToolFormValues) => {
    try {
      if (isEditMode && id) {
        await updateTool.mutateAsync({ id, data });
      } else {
        await createTool.mutateAsync(data);
      }
      navigate('/admin/tools');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isSubmitting = createTool.isPending || updateTool.isPending;

  // Auto-generate ID from name (only in create mode)
  const handleNameChange = (name: string) => {
    if (isEditMode) return; // Don't auto-generate ID when editing
    const currentId = form.getValues('id');
    if (!currentId || currentId === '') {
      const generatedId = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 100);
      form.setValue('id', generatedId);
    }
  };

  // Multi-select handler for array fields
  const toggleArrayValue = (field: ArrayFieldKeys, value: string) => {
    const currentValues = form.getValues(field);
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    form.setValue(field, newValues, { shouldValidate: true });
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/admin/tools" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tools
        </Link>
      </div>

      {isEditMode && isLoadingTool ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Tool' : 'Create New Tool'}</CardTitle>
          <CardDescription>
            {isEditMode ? `Editing: ${existingTool?.name || id}` : 'Add a new AI tool to the directory'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tool name"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleNameChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="tool-id" {...field} disabled={isEditMode} />
                      </FormControl>
                      <FormDescription>
                        {isEditMode
                          ? 'ID cannot be changed after creation'
                          : 'Unique identifier (lowercase letters, numbers, hyphens only)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description * (10-200 chars)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Brief description of the tool" {...field} />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/200 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input placeholder="Short catchy tagline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the tool (min 50 chars)"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/2000 characters (min 50 if provided)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Categories */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Categories & Targeting</h3>

                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories * (1-5)</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px]">
                        {categories.map((category) => (
                          <Badge
                            key={category}
                            variant={field.value?.includes(category) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('categories', category)}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>
                        Selected: {field.value?.length || 0}/5
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industries * (1-10)</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px]">
                        {industries.map((industry) => (
                          <Badge
                            key={industry}
                            variant={field.value?.includes(industry) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('industries', industry)}
                          >
                            {industry}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>
                        Selected: {field.value?.length || 0}/10
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Types * (1-10)</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px]">
                        {userTypes.map((userType) => (
                          <Badge
                            key={userType}
                            variant={field.value?.includes(userType) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('userTypes', userType)}
                          >
                            {userType}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>
                        Selected: {field.value?.length || 0}/10
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Technical Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Technical Specifications</h3>

                <FormField
                  control={form.control}
                  name="interface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interface *</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                        {interfaceOptions.map((item) => (
                          <Badge
                            key={item}
                            variant={field.value?.includes(item) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('interface', item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="functionality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Functionality *</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[80px]">
                        {functionalityOptions.map((item) => (
                          <Badge
                            key={item}
                            variant={field.value?.includes(item) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('functionality', item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deployment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deployment *</FormLabel>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                        {deploymentOptions.map((item) => (
                          <Badge
                            key={item}
                            variant={field.value?.includes(item) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleArrayValue('deployment', item)}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing</h3>

                <FormField
                  control={form.control}
                  name="pricingModel"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Pricing Model *</FormLabel>
                        <FormDescription>Select all that apply</FormDescription>
                      </div>
                      <div className="space-y-2">
                        {CONTROLLED_VOCABULARIES.pricingModels.map((model) => (
                          <FormField
                            key={model}
                            control={form.control}
                            name="pricingModel"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={model}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(model)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, model])
                                          : field.onChange(
                                              field.value?.filter((value: string) => value !== model)
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{model}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Pricing Tiers *</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendPricing({ tier: '', billingPeriod: 'Monthly', price: 0 })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>

                  {pricingFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start p-4 border rounded-md">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`pricing.${index}.tier`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tier Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Free, Pro, Enterprise" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-32">
                        <FormField
                          control={form.control}
                          name={`pricing.${index}.billingPeriod`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Period</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CONTROLLED_VOCABULARIES.billingPeriods.map((period) => (
                                    <SelectItem key={period} value={period}>
                                      {period}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="w-28">
                        <FormField
                          control={form.control}
                          name={`pricing.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {pricingFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-8"
                          onClick={() => removePricing(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="pricingUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/pricing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* URLs & Metadata */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">URLs & Metadata</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="documentation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documentation URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://docs.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTROLLED_VOCABULARIES.statuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contributor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contributor</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name or username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Update Tool' : 'Create Tool'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/admin/tools')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
