import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  ExternalLink,
  Download,
  FileText,
  Link as LinkIcon,
  Trash2,
  Check,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PaginationControls } from '../components/ui/PaginationControls';
import { useDebounce } from '../hooks/useDebounce';
import { Resource, ResourceType } from '../types';

export const ResourcesPage: React.FC = () => {
  const { resources, groups, addResource, deleteResource, isLoading } = useAppData();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterType, selectedGroupFilter]);

  // Form state
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [type, setType] = useState<ResourceType>('file');
  const [url, setUrl] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'xlsx' | 'pptx'>('pdf');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch =
        !debouncedSearch.trim() ||
        r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.groupName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.uploadedBy.fullName.toLowerCase().includes(debouncedSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedGroupFilter !== 'all' && r.groupId !== selectedGroupFilter) return false;

      if (filterType === 'files') return r.type === 'file';
      if (filterType === 'links') return r.type === 'link';
      if (filterType === 'pdf') return r.fileType === 'pdf';
      return true;
    });
  }, [resources, debouncedSearch, selectedGroupFilter, filterType]);

  const totalPages = Math.ceil(filteredResources.length / pageSize);
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, page, pageSize]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const group = groups.find((g) => g.id === groupId);
      await addResource({
        title: title.trim(),
        groupId,
        groupName: group?.name || 'Study Circle',
        type,
        fileType: type === 'file' ? fileType : undefined,
        urlOrPath: url.trim(),
        fileSize: type === 'file' ? '2.4 MB' : undefined,
      });

      setTitle('');
      setUrl('');
      setIsAddOpen(false);
      showToast('Learning resource shared with circle!');
    } catch (err: any) {
      showToast(err.message || 'Failed to share resource', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!resourceToDelete) return;
    try {
      await deleteResource(resourceToDelete.id);
      showToast(`Removed "${resourceToDelete.title}".`);
      setResourceToDelete(null);
    } catch {
      showToast('Failed to delete resource', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-feedback-success-light border-feedback-success/30 text-feedback-success'
              : 'bg-feedback-error-light border-feedback-error/30 text-feedback-error'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight truncate">Shared Resources</h2>
          <p className="text-xs text-navy/50 mt-0.5 line-clamp-1 sm:line-clamp-none">Formula sheets, lecture slides, study guides & notes</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Add Resource
        </Button>
      </div>

      {/* Search Input */}
      <Input
        placeholder="Search resources by title, circle or uploader…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Circle Filter and Type Filter Pills */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { key: 'all', label: 'All Resources' },
            { key: 'files', label: '📄 Documents' },
            { key: 'links', label: '🔗 Web Links' },
            { key: 'pdf', label: '📑 PDFs Only' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors
                ${
                  filterType === f.key
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-white border border-ivory-border text-navy/60 hover:bg-ivory-subtle'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Circles filter strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
              selectedGroupFilter === 'all'
                ? 'bg-teal text-white'
                : 'bg-ivory-subtle text-navy/60 hover:bg-ivory-border'
            }`}
          >
            All Circles
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupFilter(g.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                selectedGroupFilter === g.id
                  ? 'bg-teal text-white'
                  : 'bg-ivory-subtle text-navy/60 hover:bg-ivory-border'
              }`}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy/40 uppercase tracking-wider block">
            Materials Library ({filteredResources.length})
          </span>
          {(search || filterType !== 'all' || selectedGroupFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setSelectedGroupFilter('all');
              }}
              className="text-xs text-teal font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-card border border-ivory-border p-6">
            <FolderOpen className="w-10 h-10 text-navy/30 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-navy">No learning resources found</h4>
            <p className="text-xs text-navy/50 mt-1 max-w-xs mx-auto">
              {search
                ? `No materials matched "${search}". Try adjusting your keywords.`
                : 'Upload lecture slides, cheat sheets, or links to share with your study group.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setIsAddOpen(true)}
            >
              Add First Resource
            </Button>
          </div>
        ) : (
          <>
            {paginatedResources.map((res) => (
              <Card
                key={res.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-teal/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl shadow-xs ${
                      res.type === 'file'
                        ? 'bg-teal-light text-teal'
                        : 'bg-amber-light text-amber'
                    }`}
                  >
                    {res.type === 'file' ? '📄' : '🔗'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-navy truncate" title={res.title}>{res.title}</h4>
                      {res.fileType && (
                        <Badge variant="gray" size="sm" className="shrink-0">
                          {res.fileType.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-navy/50 truncate mt-0.5">
                      {res.groupName} · Uploaded by {res.uploadedBy.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold text-navy/40 truncate">
                        {res.fileSize || 'External Link'} · {res.uploadedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={res.urlOrPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-teal hover:bg-teal-light rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title={res.type === 'file' ? 'Download / View File' : 'Open Link'}
                  >
                    {res.type === 'file' ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                    <span className="hidden sm:inline">{res.type === 'file' ? 'Download' : 'Open'}</span>
                  </a>
                  <button
                    onClick={() => setResourceToDelete(res)}
                    className="p-2 text-feedback-error/50 hover:text-feedback-error hover:bg-feedback-error-light rounded-lg transition-colors"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalCount={filteredResources.length}
              pageSize={pageSize}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!resourceToDelete}
        onClose={() => setResourceToDelete(null)}
        title="Remove Learning Resource?"
        description={`Are you sure you want to delete "${resourceToDelete?.title}" from ${resourceToDelete?.groupName}?`}
      >
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setResourceToDelete(null)}>
            Keep Resource
          </Button>
          <Button variant="danger" fullWidth onClick={handleConfirmDelete}>
            Yes, Remove
          </Button>
        </div>
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Share a Learning Resource"
        description="Make cheat sheets, past papers, or tutorial links accessible to your peers."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Thermodynamics Formula Summary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Study Circle</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Resource Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('file')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                  type === 'file' ? 'border-teal bg-teal-light text-teal' : 'border-ivory-border bg-white text-navy/60'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Document File</span>
              </button>
              <button
                type="button"
                onClick={() => setType('link')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                  type === 'link' ? 'border-teal bg-teal-light text-teal' : 'border-ivory-border bg-white text-navy/60'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Web Link</span>
              </button>
            </div>
          </div>

          {type === 'file' && (
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">File Format</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="docx">Word Document (.docx)</option>
                <option value="xlsx">Spreadsheet (.xlsx)</option>
                <option value="pptx">Slides Presentation (.pptx)</option>
              </select>
            </div>
          )}

          <Input
            label={type === 'file' ? 'File Storage URL / Path' : 'External Web URL'}
            placeholder={
              type === 'file'
                ? 'https://storage.university.edu/physics/thermo_summary.pdf'
                : 'https://docs.google.com/document/d/...'
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || !title.trim() || !url.trim()}
            >
              {isSubmitting ? 'Sharing...' : 'Upload & Share'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
