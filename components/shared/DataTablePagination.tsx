'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
}

export function DataTablePagination({
  page,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  itemName = 'items',
  className,
}: DataTablePaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const startItem = totalItems !== undefined && totalItems > 0 ? (page - 1) * pageSize + 1 : undefined;
  const endItem = totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3',
        className
      )}
    >
      {/* Information label */}
      <div className="text-xs text-muted-foreground order-2 sm:order-1">
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span>
            Showing <strong className="font-medium text-foreground">{startItem}</strong> to{' '}
            <strong className="font-medium text-foreground">{endItem}</strong> of{' '}
            <strong className="font-medium text-foreground">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Page <strong className="font-medium text-foreground">{page}</strong> of{' '}
            <strong className="font-medium text-foreground">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Shadcn UI Pagination */}
      <div className="order-1 sm:order-2">
        <Pagination>
          <PaginationContent>
            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={cn(
                  page <= 1 && 'pointer-events-none opacity-40 cursor-not-allowed'
                )}
                aria-disabled={page <= 1}
              />
            </PaginationItem>

            {/* Page number buttons */}
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      if (p !== page) onPageChange(p);
                    }}
                    className="h-8 w-8 text-xs cursor-pointer select-none"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={cn(
                  page >= totalPages && 'pointer-events-none opacity-40 cursor-not-allowed'
                )}
                aria-disabled={page >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
