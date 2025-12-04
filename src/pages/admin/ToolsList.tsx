import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToolsAdmin, useDeleteTool, Tool, ToolsQueryParams } from '@/hooks/api/useToolsAdmin';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Edit, ExternalLink, Loader2, ArrowLeft, LogOut, User } from 'lucide-react';

export default function ToolsList() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [params, setParams] = useState<ToolsQueryParams>({
    page: 1,
    limit: 20,
    sortBy: 'dateAdded',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, error } = useToolsAdmin(params);
  const deleteTool = useDeleteTool();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleStatusFilter = (status: string) => {
    setParams((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : status,
      page: 1,
    }));
  };

  const handlePricingFilter = (pricingModel: string) => {
    setParams((prev) => ({
      ...prev,
      pricingModel: pricingModel === 'all' ? undefined : pricingModel,
      page: 1,
    }));
  };

  const handleDelete = async (id: string) => {
    await deleteTool.mutateAsync(id);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'beta':
        return 'secondary';
      case 'deprecated':
        return 'destructive';
      case 'discontinued':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPricingBadgeVariant = (pricingModel: string) => {
    switch (pricingModel) {
      case 'Free':
        return 'default';
      case 'Freemium':
        return 'secondary';
      case 'Paid':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!data?.pagination) return [];
    const { page, totalPages } = data.pagination;
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tools Management</CardTitle>
              <CardDescription>
                Manage your AI tools directory
                {data?.pagination && ` (${data.pagination.total} total tools)`}
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/admin/tools/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex gap-2">
              <Select
                value={params.status || 'all'}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={params.pricingModel || 'all'}
                onValueChange={handlePricingFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricing</SelectItem>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Freemium">Freemium</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="text-center py-12 text-destructive">
              <p>Error loading tools: {error?.message || 'Unknown error'}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Table */}
          {!isLoading && !isError && data && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell">Categories</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <p className="text-muted-foreground">No tools found</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => navigate('/admin/tools/new')}
                          >
                            Add your first tool
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((tool: Tool) => (
                        <TableRow key={tool.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tool.name}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                                {tool.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {tool.categories?.slice(0, 3).map((cat) => (
                                <Badge key={cat} variant="outline" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                              {tool.categories?.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tool.categories.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPricingBadgeVariant(tool.pricingModel)}>
                              {tool.pricingModel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(tool.status)}>
                              {tool.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {new Date(tool.dateAdded).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {tool.website && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                >
                                  <a
                                    href={tool.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/tools/${tool.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{tool.name}"? This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(tool.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
                    {Math.min(
                      data.pagination.page * data.pagination.limit,
                      data.pagination.total
                    )}{' '}
                    of {data.pagination.total} results
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            data.pagination.hasPrevPage &&
                            handlePageChange(data.pagination.page - 1)
                          }
                          className={
                            !data.pagination.hasPrevPage
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>

                      {getPageNumbers().map((pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            isActive={pageNum === data.pagination.page}
                            onClick={() => handlePageChange(pageNum)}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            data.pagination.hasNextPage &&
                            handlePageChange(data.pagination.page + 1)
                          }
                          className={
                            !data.pagination.hasNextPage
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
