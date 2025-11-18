# Phase 2: Mutation Hooks - Implementation Guide

**Date**: November 17, 2025
**Status**: ✅ Complete and Ready to Use
**Estimated Reading Time**: 15 minutes

---

## 🎉 What Was Implemented

Phase 2 adds complete CREATE, UPDATE, and DELETE functionality with professional-grade mutation hooks!

✅ **useCreateTool** - Create new tools with automatic cache updates
✅ **useUpdateTool** - Update existing tools with optimistic updates
✅ **useDeleteTool** - Delete tools safely with confirmation helper
✅ **Type Safety** - Full TypeScript support for all operations
✅ **Optimistic Updates** - Instant UI updates (optional)
✅ **Cache Management** - Automatic invalidation and updates
✅ **Toast Notifications** - Success/error feedback
✅ **Flexible Options** - Customize behavior per use case

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [useCreateTool Hook](#useCreatetool-hook)
3. [useUpdateTool Hook](#useupdatetool-hook)
4. [useDeleteTool Hook](#usedeletetool-hook)
5. [Optimistic Updates](#optimistic-updates)
6. [Advanced Patterns](#advanced-patterns)
7. [TypeScript Types](#typescript-types)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Installation

Mutation hooks are already available! Just import them:

```typescript
import { useCreateTool, useUpdateTool, useDeleteTool } from '@/hooks/api/mutations';
```

### Basic Example

```typescript
import { useCreateTool } from '@/hooks/api/mutations';
import { Button } from '@/components/ui/button';

function CreateToolButton() {
  const createTool = useCreateTool({
    onSuccess: (newTool) => {
      console.log('Created:', newTool.name);
    }
  });

  const handleClick = () => {
    createTool.mutate({
      name: 'My New Tool',
      slug: 'my-new-tool',
      description: 'A description of my tool',
      categories: {
        primary: ['Development', 'AI'],
      },
      pricingSummary: {
        lowestMonthlyPrice: 0,
        highestMonthlyPrice: 99,
        currency: 'USD',
        hasFreeTier: true,
        hasCustomPricing: false,
        billingPeriods: ['monthly'],
        pricingModel: ['freemium'],
      },
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={createTool.isPending}
    >
      {createTool.isPending ? 'Creating...' : 'Create Tool'}
    </Button>
  );
}
```

---

## 📝 useCreateTool Hook

### Basic Usage

```typescript
import { useCreateTool, type CreateToolParams } from '@/hooks/api/mutations';

function MyComponent() {
  const createTool = useCreateTool();

  const handleSubmit = (formData: CreateToolParams) => {
    createTool.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createTool.isPending}>
        {createTool.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### With Custom Callbacks

```typescript
const createTool = useCreateTool({
  onSuccess: (newTool) => {
    console.log('Tool created:', newTool.id);
    navigate(`/tools/${newTool.id}`);
  },
  onError: (error) => {
    console.error('Failed to create:', error.message);
  },
  successMessage: 'Tool created successfully! 🎉',
  errorMessage: 'Oops! Something went wrong.',
});
```

### With Optimistic Updates

```typescript
const createTool = useCreateTool({
  optimistic: true, // Add to UI immediately
  onSuccess: (newTool) => {
    toast({ title: 'Tool created!', description: newTool.name });
  },
});
```

### Required Fields

```typescript
{
  // Required
  name: string;
  slug: string;
  description: string;

  categories: {
    primary: string[]; // At least 1-5 categories
  };

  pricingSummary: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: ('free' | 'freemium' | 'paid')[];
  };

  // Optional but recommended
  longDescription?: string;
  tagline?: string;
  logoUrl?: string;
  website?: string;
  // ... many more optional fields
}
```

---

## 🔄 useUpdateTool Hook

### Basic Usage

```typescript
import { useUpdateTool } from '@/hooks/api/mutations';

function EditToolForm({ toolId }: { toolId: string }) {
  const updateTool = useUpdateTool();

  const handleUpdate = (changes: Partial<Tool>) => {
    updateTool.mutate({
      id: toolId,
      ...changes, // Only the fields that changed
    });
  };

  return (
    <button onClick={() => handleUpdate({ name: 'New Name' })}>
      Update Name
    </button>
  );
}
```

### Partial Updates

You only need to send the fields that changed:

```typescript
// Update just the rating
updateTool.mutate({
  id: toolId,
  rating: 4.5,
});

// Update multiple fields
updateTool.mutate({
  id: toolId,
  name: 'New Name',
  description: 'New description',
  rating: 4.8,
});
```

### With Optimistic Updates

```typescript
const updateTool = useUpdateTool({
  optimistic: true, // UI updates immediately
  successMessage: 'Changes saved!',
});

// User sees the change instantly
const handleRatingChange = (newRating: number) => {
  updateTool.mutate({
    id: toolId,
    rating: newRating,
  });
};
```

### In a Form

```typescript
function EditToolForm({ tool }: { tool: AITool }) {
  const updateTool = useUpdateTool({
    onSuccess: () => {
      toast({ title: 'Saved!', description: 'Your changes have been saved.' });
      setEditMode(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    updateTool.mutate({
      id: tool.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      // ... other fields
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" defaultValue={tool.name} />
      <textarea name="description" defaultValue={tool.description} />
      <button type="submit" disabled={updateTool.isPending}>
        {updateTool.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

---

## 🗑️ useDeleteTool Hook

### Basic Usage

```typescript
import { useDeleteTool } from '@/hooks/api/mutations';

function DeleteButton({ toolId }: { toolId: string }) {
  const deleteTool = useDeleteTool({
    onSuccess: () => {
      navigate('/tools');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      deleteTool.mutate({ id: toolId });
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteTool.isPending}>
      {deleteTool.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### With Confirmation Helper

```typescript
import { useDeleteToolWithConfirm } from '@/hooks/api/mutations';

function DeleteButton({ toolId }: { toolId: string }) {
  const { confirmDelete, isDeleting } = useDeleteToolWithConfirm({
    confirmMessage: 'This tool will be permanently deleted. Continue?',
    onSuccess: () => {
      navigate('/tools');
    },
  });

  return (
    <button onClick={() => confirmDelete({ id: toolId })} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete Tool'}
    </button>
  );
}
```

### Soft Delete

```typescript
const deleteTool = useDeleteTool({
  successMessage: 'Tool archived',
});

// Mark as deleted, don't remove
const handleArchive = () => {
  deleteTool.mutate({
    id: toolId,
    soft: true, // Soft delete
  });
};
```

### With Optimistic Updates

```typescript
const deleteTool = useDeleteTool({
  optimistic: true, // Remove from UI immediately
  onSuccess: () => {
    toast({ title: 'Deleted', description: 'Tool has been removed' });
  },
});

// User sees it disappear instantly
const handleDelete = () => {
  deleteTool.mutate({ id: toolId });
};
```

---

## ⚡ Optimistic Updates

Optimistic updates make your UI feel instant by updating the cache before the server responds.

### How It Works

1. **User triggers action** → Click "Create" button
2. **UI updates immediately** → New tool appears in list
3. **API call happens** → Request sent to server
4. **Success** → Keep the optimistic update
5. **Error** → Rollback to previous state

### Example: Create with Optimistic Update

```typescript
const createTool = useCreateTool({
  optimistic: true,
  onSuccess: (newTool) => {
    // Tool is already visible in the UI!
    navigate(`/tools/${newTool.id}`);
  },
  onError: (error) => {
    // Automatically rolled back
    toast({ title: 'Failed', description: error.message });
  },
});

// User sees the new tool immediately
createTool.mutate(newToolData);
```

### Example: Update with Optimistic Update

```typescript
const updateTool = useUpdateTool({
  optimistic: true,
});

// Rating updates instantly in the UI
const handleRating = (rating: number) => {
  updateTool.mutate({
    id: toolId,
    rating,
  });
};
```

### Example: Delete with Optimistic Update

```typescript
const deleteTool = useDeleteTool({
  optimistic: true,
});

// Tool disappears immediately
const handleDelete = () => {
  deleteTool.mutate({ id: toolId });
};
```

### When to Use Optimistic Updates

**Use when**:
- ✅ Action is likely to succeed (high success rate)
- ✅ User expects immediate feedback (e.g., rating, like)
- ✅ Rollback is acceptable if it fails

**Don't use when**:
- ❌ Action involves money or critical data
- ❌ Success is uncertain (complex validation)
- ❌ User needs to see server response first

---

## 🎯 Advanced Patterns

### Pattern 1: Form with Validation

```typescript
import { useCreateTool } from '@/hooks/api/mutations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const toolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(500),
  // ... other fields
});

function CreateToolForm() {
  const createTool = useCreateTool({
    onSuccess: () => navigate('/tools'),
  });

  const form = useForm({
    resolver: zodResolver(toolSchema),
  });

  const onSubmit = (data: z.infer<typeof toolSchema>) => {
    createTool.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={createTool.isPending}>
        {createTool.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Pattern 2: Batch Operations

```typescript
import { useUpdateTool } from '@/hooks/api/mutations';

function BatchUpdateComponent({ tools }: { tools: AITool[] }) {
  const updateTool = useUpdateTool();
  const [updating, setUpdating] = useState(false);

  const handleBatchUpdate = async () => {
    setUpdating(true);

    for (const tool of tools) {
      await updateTool.mutateAsync({
        id: tool.id,
        status: 'active',
      });
    }

    setUpdating(false);
    toast({ title: 'All tools updated!' });
  };

  return (
    <button onClick={handleBatchUpdate} disabled={updating}>
      {updating ? 'Updating...' : 'Activate All'}
    </button>
  );
}
```

### Pattern 3: Multi-Step Create

```typescript
function MultiStepCreateTool() {
  const createTool = useCreateTool();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const handleFinalSubmit = () => {
    createTool.mutate(formData, {
      onSuccess: (newTool) => {
        // Step 1: Create the tool
        // Step 2: Upload logo
        uploadLogo(newTool.id, logoFile);
      },
    });
  };

  return (
    <div>
      {step === 1 && <Step1 onNext={data => { setFormData(data); setStep(2); }} />}
      {step === 2 && <Step2 onNext={data => { setFormData({...formData, ...data}); setStep(3); }} />}
      {step === 3 && <Step3 onSubmit={handleFinalSubmit} />}
    </div>
  );
}
```

### Pattern 4: Undo Functionality

```typescript
function ToolListWithUndo() {
  const deleteTool = useDeleteTool({
    showSuccessToast: false, // We'll show our own
  });

  const handleDeleteWithUndo = (tool: AITool) => {
    let undoTimeout: NodeJS.Timeout;

    deleteTool.mutate(
      { id: tool.id },
      {
        onSuccess: () => {
          const { dismiss } = toast({
            title: 'Tool deleted',
            description: (
              <div>
                {tool.name} was deleted.
                <button onClick={() => {
                  clearTimeout(undoTimeout);
                  dismiss();
                  // Recreate the tool
                  createTool.mutate(tool);
                }}>
                  Undo
                </button>
              </div>
            ),
          });

          // Auto-dismiss after 5 seconds
          undoTimeout = setTimeout(dismiss, 5000);
        },
      }
    );
  };

  return (
    <button onClick={() => handleDeleteWithUndo(tool)}>
      Delete
    </button>
  );
}
```

---

## 📘 TypeScript Types

All mutation hooks are fully typed!

### Import Types

```typescript
import {
  useCreateTool,
  useUpdateTool,
  useDeleteTool,
  type CreateToolParams,
  type UpdateToolParams,
  type DeleteToolParams,
  type MutationHookOptions,
} from '@/hooks/api/mutations';
```

### CreateToolParams

```typescript
interface CreateToolParams {
  // Required
  name: string;
  slug: string;
  description: string;
  categories: {
    primary: string[];
    secondary?: string[];
    industries?: string[];
    userTypes?: string[];
  };
  pricingSummary: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: ('free' | 'freemium' | 'paid')[];
  };

  // Optional (100+ more fields available)
  longDescription?: string;
  tagline?: string;
  logoUrl?: string;
  website?: string;
  // ...
}
```

### UpdateToolParams

```typescript
interface UpdateToolParams {
  id: string; // Required
  // All other fields are optional (partial update)
  name?: string;
  description?: string;
  rating?: number;
  // ... any field from CreateToolParams
}
```

### DeleteToolParams

```typescript
interface DeleteToolParams {
  id: string;
  soft?: boolean; // Default: false
}
```

### MutationHookOptions

```typescript
interface MutationHookOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => void | Promise<OptimisticUpdateContext>;
  onSettled?: (data: TData | undefined, error: Error | null) => void;

  optimistic?: boolean;         // Default: false
  showSuccessToast?: boolean;   // Default: true
  showErrorToast?: boolean;     // Default: true
  successMessage?: string;
  errorMessage?: string;
}
```

---

## 💡 Best Practices

### 1. Use Optimistic Updates for Quick Actions

```typescript
// ✅ Good: Instant feedback
const updateTool = useUpdateTool({ optimistic: true });
updateTool.mutate({ id, rating: 5 });

// ❌ Avoid: User waits for server
const updateTool = useUpdateTool({ optimistic: false });
updateTool.mutate({ id, rating: 5 });
```

### 2. Always Handle Errors

```typescript
// ✅ Good: Handle errors gracefully
const createTool = useCreateTool({
  onError: (error) => {
    if (error.message.includes('duplicate')) {
      toast({ title: 'Tool already exists' });
    }
  },
});

// ❌ Avoid: Ignoring errors
const createTool = useCreateTool();
```

### 3. Disable Buttons During Mutation

```typescript
// ✅ Good: Prevent double-submit
<button disabled={createTool.isPending}>
  {createTool.isPending ? 'Creating...' : 'Create'}
</button>

// ❌ Avoid: Allow multiple clicks
<button>Create</button>
```

### 4. Use Partial Updates

```typescript
// ✅ Good: Only send changed fields
updateTool.mutate({
  id: toolId,
  rating: 4.5,
});

// ❌ Avoid: Sending entire object
updateTool.mutate(entireToolObject);
```

### 5. Customize Messages

```typescript
// ✅ Good: Clear, contextual messages
const createTool = useCreateTool({
  successMessage: 'Your tool has been published!',
  errorMessage: 'Failed to publish. Check your internet connection.',
});

// ❌ Avoid: Generic messages
const createTool = useCreateTool();
```

---

## 🐛 Troubleshooting

### Problem: Mutation not updating the UI

**Solution**: Cache invalidation should be automatic. If not working:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
const updateTool = useUpdateTool({
  onSuccess: () => {
    // Manually invalidate if needed
    queryClient.invalidateQueries({ queryKey: ['tools'] });
  },
});
```

### Problem: Optimistic update not rolling back on error

**Solution**: Ensure `optimistic: true` is set:

```typescript
const updateTool = useUpdateTool({
  optimistic: true, // Must be true for rollback
});
```

### Problem: Toast showing twice

**Solution**: Disable automatic toast and show your own:

```typescript
const createTool = useCreateTool({
  showSuccessToast: false,
  onSuccess: () => {
    toast({ title: 'My custom message' });
  },
});
```

### Problem: TypeScript errors

**Solution**: Import types explicitly:

```typescript
import type { CreateToolParams } from '@/hooks/api/mutations';

const data: CreateToolParams = {
  // TypeScript will help with required fields
};
```

---

## 📊 Hook State Properties

All mutation hooks return the same state properties:

```typescript
const mutation = useCreateTool();

// State
mutation.isPending     // true while mutation is running
mutation.isSuccess     // true if mutation succeeded
mutation.isError       // true if mutation failed
mutation.error         // Error object if failed
mutation.data          // Result data if succeeded

// Methods
mutation.mutate(data)       // Trigger mutation (fire and forget)
mutation.mutateAsync(data)  // Trigger mutation (returns Promise)
mutation.reset()            // Reset state to idle

// Shorthand checks
mutation.isPending && <Spinner />
mutation.isError && <ErrorMessage error={mutation.error} />
mutation.isSuccess && <SuccessMessage data={mutation.data} />
```

---

## ✅ Summary

Phase 2 provides complete CRUD operations with:

- ✅ **useCreateTool** - Create with validation and cache updates
- ✅ **useUpdateTool** - Partial updates with optimistic UI
- ✅ **useDeleteTool** - Safe deletion with confirmation
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Cache Management** - Automatic invalidation
- ✅ **Optimistic Updates** - Instant UI feedback
- ✅ **Toast Notifications** - User feedback
- ✅ **Flexible Options** - Customize per use case

---

## 🚦 What's Next?

### Phase 3: Enhanced Error Handling (Optional)

- Error Boundary component
- Retry UI components
- Offline detection
- Connection status indicator

### Phase 4: Polish & Optimization (Optional)

- Custom debounce hook
- API versioning support
- Offline retry queue
- Request cancellation

---

## 📚 Related Documentation

- **Phase 1 Guide**: `docs/PHASE_1_IMPLEMENTATION_GUIDE.md`
- **Architecture Analysis**: `docs/FRONTEND_API_ARCHITECTURE_ANALYSIS.md`
- **API Client**: `src/api/client.ts`
- **Query Hooks**: `src/hooks/api/useTools.ts`, `src/hooks/api/useTool.ts`

---

**Phase 2 Status**: ✅ Complete and Production-Ready
**Total Lines Added**: 800+ lines of mutation hooks and types
**TypeScript Errors**: 0
**Build Status**: ✅ Successful

Happy mutating! 🚀
