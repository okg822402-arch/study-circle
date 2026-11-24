import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Resource, ResourceType, ResourceFilterParams, PaginatedResponse } from '../types';
import { validateEducationalUrl } from '../utils/validators';
import { resilientQuery } from '../lib/resilientQuery';

export const resourceService = {
  /**
   * Fetch paginated educational resources with server-side filtering, sorting,
   * request timeouts, and controlled retries.
   * Default pageSize is 20 records per page.
   */
  async fetchPaginatedResources(
    params: ResourceFilterParams = {}
  ): Promise<PaginatedResponse<Resource>> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (!isSupabaseConfigured) {
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
      };
    }

    return resilientQuery.execute(
      async (signal) => {
        let query = (supabase as any)
          .from('resources')
          .select(
            `
            id,
            group_id,
            title,
            subject,
            description,
            resource_type,
            file_type,
            file_size,
            url_or_path,
            uploaded_by,
            created_at,
            study_groups ( name ),
            profiles:uploaded_by ( id, full_name )
          `,
            { count: 'exact' }
          )
          .order('created_at', { ascending: false });

        if (params.groupId && params.groupId !== 'all') {
          query = query.eq('group_id', params.groupId);
        }

        if (params.resourceType && params.resourceType !== 'all') {
          if (params.resourceType === 'pdf') {
            query = query.eq('file_type', 'pdf');
          } else {
            query = query.eq('resource_type', params.resourceType);
          }
        }

        if (params.subject && params.subject !== 'all') {
          query = query.eq('subject', params.subject);
        }

        if (params.search && params.search.trim()) {
          const term = `%${params.search.trim()}%`;
          query = query.ilike('title', term);
        }

        // Server-side pagination (20 per page)
        query = query.range(from, to);

        if (signal) {
          query = query.abortSignal(signal);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error('Error fetching paginated resources:', error);
          throw error;
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const mappedResources: Resource[] = (data || []).map((r: any) => ({
          id: r.id,
          groupId: r.group_id,
          groupName: r.study_groups?.name || 'Study Circle',
          title: r.title,
          subject: r.subject || r.study_groups?.name || 'General',
          description: r.description || undefined,
          type: (r.resource_type as ResourceType) || 'link',
          fileType: r.file_type || undefined,
          fileSize: r.file_size || undefined,
          urlOrPath: r.url_or_path,
          educationalUrl: r.url_or_path,
          createdBy: r.uploaded_by,
          uploadedBy: {
            id: r.profiles?.id || r.uploaded_by,
            fullName: r.profiles?.full_name || 'Student',
            initials: (r.profiles?.full_name || 'ST')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
          },
          uploadedAt: new Date(r.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          dateAdded: new Date(r.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        }));

        return {
          data: mappedResources,
          totalCount,
          page,
          pageSize,
          totalPages,
          hasMore: page < totalPages,
        };
      },
      {
        timeoutMs: 8000,
        maxRetries: 2,
        isPrivate: true,
      }
    );
  },
  /**
   * Fetch educational resources for specified groups or all groups visible to the user
   */
  async fetchResources(groupIds?: string[]): Promise<Resource[]> {
    if (!isSupabaseConfigured) return [];

    let query = (supabase as any)
      .from('resources')
      .select(`
        id,
        group_id,
        title,
        subject,
        description,
        resource_type,
        file_type,
        file_size,
        url_or_path,
        uploaded_by,
        created_at,
        study_groups ( name ),
        profiles:uploaded_by ( id, full_name, avatar_url )
      `)
      .order('created_at', { ascending: false });

    if (groupIds && groupIds.length > 0) {
      query = query.in('group_id', groupIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((r: any) => ({
      id: r.id,
      groupId: r.group_id,
      groupName: r.study_groups?.name || 'Study Circle',
      title: r.title,
      subject: r.subject || r.study_groups?.name || 'General',
      description: r.description || undefined,
      type: (r.resource_type as ResourceType) || 'link',
      fileType: r.file_type || undefined,
      fileSize: r.file_size || undefined,
      urlOrPath: r.url_or_path,
      educationalUrl: r.url_or_path,
      createdBy: r.uploaded_by,
      uploadedBy: {
        id: r.profiles?.id || r.uploaded_by,
        fullName: r.profiles?.full_name || 'Student',
        initials: (r.profiles?.full_name || 'ST')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      },
      uploadedAt: new Date(r.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      dateAdded: new Date(r.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    }));
  },

  /**
   * Add a new educational link resource with server-side URL validation
   */
  async createResource(data: {
    groupId: string;
    uploadedBy: string;
    title: string;
    subject?: string;
    description?: string;
    type?: ResourceType;
    urlOrPath: string;
    fileType?: string;
    fileSize?: string;
  }): Promise<string> {
    // Validate educational URL strictly
    const urlValidation = validateEducationalUrl(data.urlOrPath);
    if (!urlValidation.isValid) {
      throw new Error(urlValidation.error);
    }

    if (!isSupabaseConfigured) return `res-${Date.now()}`;

    const { data: created, error } = await (supabase as any)
      .from('resources')
      .insert({
        group_id: data.groupId,
        uploaded_by: data.uploadedBy,
        title: data.title.trim(),
        subject: (data.subject || 'General').trim(),
        description: data.description ? data.description.trim() : null,
        resource_type: data.type || 'link',
        file_type: data.fileType || null,
        file_size: data.fileSize || null,
        url_or_path: data.urlOrPath.trim(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      throw error;
    }

    return created.id;
  },

  /**
   * Delete a learning resource (creator / circle admin action)
   */
  async deleteResource(resourceId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }
};
