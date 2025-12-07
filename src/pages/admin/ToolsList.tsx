import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useMyTools,
  useAdminTools,
  useDeleteTool,
  useApproveTool,
  useRejectTool,
  Tool,
  ToolsQueryParams,
  ApprovalStatus,
} from '@/hooks/api/useToolsAdmin';
import { useClerk } from '@clerk/clerk-react';
import { useUserRole } from '@/hooks/useUserRole';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Search, Trash2, Edit, ExternalLink, Loader2, ArrowLeft, LogOut, User, Check, X, AlertCircle } from 'lucide-react';

export default function ToolsList() {
  const navigate = useNavigate();
  // const { role, isLoading: isRoleLoading, userId } = useUserRole();
  const { signOut } = useClerk();
  const { isAdmin, role, isLoading: roleLoading, userId } = useUserRole();
  const [params, setParams] = useState<ToolsQueryParams>({
    page: 1,
    limit: 20,
    sortBy: 'dateAdded',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [toolToReject, setToolToReject] = useState<string | null>(null);

  // Use admin endpoint for admins, my-tools for maintainers
  // Only enable the appropriate query based on role (once role is loaded)
  const adminQuery = useAdminTools({
    ...params,
    enabled: !roleLoading && isAdmin,
  });
  const myToolsQuery = useMyTools({
    ...params,
    enabled: !roleLoading && !isAdmin,
  });
  const { data, isLoading: dataLoading, isError, error } = isAdmin ? adminQuery : myToolsQuery;
  const isLoading = roleLoading || dataLoading;

  const deleteTool = useDeleteTool();
  const approveTool = useApproveTool();
  const rejectTool = useRejectTool();

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

  const handleApprovalStatusFilter = (approvalStatus: string) => {
    setParams((prev) => ({
      ...prev,
      approvalStatus: approvalStatus === 'all' ? undefined : (approvalStatus as ApprovalStatus),
      page: 1,
    }));
  };

  const handleDelete = async (id: string) => {
    await deleteTool.mutateAsync(id);
  };

  const handleApprove = async (id: string) => {
    await approveTool.mutateAsync(id);
  };

  const handleReject = async () => {
    if (toolToReject && rejectionReason.trim()) {
      await rejectTool.mutateAsync({ id: toolToReject, reason: rejectionReason.trim() });
      setRejectDialogOpen(false);
      setToolToReject(null);
      setRejectionReason('');
    }
  };

  const openRejectDialog = (id: string) => {
    setToolToReject(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
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
      case 'Paid':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getApprovalBadgeVariant = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Check if user can edit a tool (owner of pending tool, or admin)
  const canEditTool = (tool: Tool) => {
    if (isAdmin) return true;
    // Maintainers can only edit their own pending tools
    return tool.contributor === userId && tool.approvalStatus === 'pending';
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
            <span>{userId ? `User (${role || 'loading...'})` : 'Loading...'}</span>
            {role && (
              <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="ml-1">
                {role}
              </Badge>
            )}
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
              <CardTitle>
                {isAdmin ? 'Admin: Tools Management' : 'My Tools'}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Manage all AI tools in the directory'
                  : 'View and manage your submitted tools'}
                {data?.pagination && ` (${data.pagination.total} total tools)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {role}
              </Badge>
              <Button onClick={() => navigate('/admin/tools/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tool
              </Button>
            </div>
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
                  <SelectItem value="all">Status</SelectItem>
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
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={params.approvalStatus || 'all'}
                onValueChange={handleApprovalStatusFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Approval</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading state - for role or tools data */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                {roleLoading ? 'Loading user role...' : 'Loading tools...'}
              </span>
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
                      <TableHead>Approval</TableHead>
                      <TableHead className="hidden lg:table-cell">Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
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
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(tool.pricingModel) ? (
                                tool.pricingModel.map((model) => (
                                  <Badge key={model} variant={getPricingBadgeVariant(model)}>
                                    {model}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant={getPricingBadgeVariant(tool.pricingModel)}>
                                  {tool.pricingModel}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(tool.status)}>
                              {tool.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                <Badge variant={getApprovalBadgeVariant(tool.approvalStatus)}>
                                  {tool.approvalStatus}
                                </Badge>
                                {tool.approvalStatus === 'rejected' && tool.rejectionReason && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px]">
                                      <p className="font-medium">Rejection reason:</p>
                                      <p>{tool.rejectionReason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {new Date(tool.dateAdded).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* External link */}
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

                              {/* Admin approve/reject actions for pending tools */}
                              {isAdmin && tool.approvalStatus === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleApprove(tool.id)}
                                    disabled={approveTool.isPending}
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openRejectDialog(tool.id)}
                                    disabled={rejectTool.isPending}
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}

                              {/* Edit button - only if user can edit */}
                              {canEditTool(tool) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/admin/tools/${tool.id}/edit`)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete button - admin only */}
                              {isAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Delete">
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
                              )}
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

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tool</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this tool. This will be visible to the contributor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectTool.isPending}
            >
              {rejectTool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
