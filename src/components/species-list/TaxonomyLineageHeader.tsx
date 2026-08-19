import { BookOpen, GitBranch } from 'lucide-react';
import { getFamilyCommonName } from '@/config/familyCommonNames';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';

interface TaxonomyLineageHeaderProps {
  className: string;
  order: string;
  family: string;
  genus: string;
  speciesCount: number;
}

export function TaxonomyLineageHeader({
  className,
  order,
  family,
  genus,
  speciesCount,
}: TaxonomyLineageHeaderProps) {
  const familyCommonName = getFamilyCommonName(family);

  return (
    <header className="border-b border-border bg-card/80 px-3 py-3 sm:px-4" aria-label={`${family}, ${genus} classification`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Taxonomic family
          </div>
          <h4 className="mt-1 truncate font-serif text-xl leading-tight text-foreground">{family}</h4>
          {familyCommonName && <p className="mt-0.5 text-xs text-muted-foreground">{familyCommonName}</p>}
        </div>
        <Badge variant="outline" className="shrink-0">
          {speciesCount} species
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2">
        <GitBranch className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Genus</span>
        <span className="min-w-0 truncate font-serif text-sm italic text-foreground">{genus}</span>
      </div>

      <Breadcrumb className="mt-2.5">
        <BreadcrumbList className="gap-1 text-[10px] sm:gap-1.5">
          <BreadcrumbItem><span className="text-muted-foreground">{className}</span></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><span className="text-muted-foreground">{order}</span></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><span className="text-muted-foreground">{family}</span></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage className="font-serif italic">{genus}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
