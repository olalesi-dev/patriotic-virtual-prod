import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { type ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

export interface PaginationProps extends ComponentProps<'nav'> {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({
  className,
  page,
  pageCount,
  onPageChange,
  ...props
}: PaginationProps) {
  return (
    <nav
      aria-label="pagination"
      className={cn('flex items-center justify-between gap-2', className)}
      {...props}
    >
      <Button
        disabled={page <= 1}
        leftContent={<IconChevronLeft size={16} />}
        type="button"
        variant="outline"
        onClick={() => onPageChange?.(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page <strong className="text-foreground">{page}</strong> of{' '}
        <strong className="text-foreground">{pageCount}</strong>
      </span>
      <Button
        disabled={page >= pageCount}
        rightContent={<IconChevronRight size={16} />}
        type="button"
        variant="outline"
        onClick={() => onPageChange?.(Math.min(pageCount, page + 1))}
      >
        Next
      </Button>
    </nav>
  );
}
