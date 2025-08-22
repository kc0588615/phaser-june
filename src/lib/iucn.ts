export type IucnCode = 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | string;

export function iucnLabel(status: IucnCode): string {
  const labels = {
    CR: 'Critically Endangered',
    EN: 'Endangered',
    VU: 'Vulnerable',
    NT: 'Near Threatened',
    LC: 'Least Concern',
  } as const;
  return labels[status as keyof typeof labels] ?? String(status);
}

export function iucnBadgeClasses(status: IucnCode): string {
  switch (status) {
    case 'CR':
      return 'bg-red-600 text-white';
    case 'EN':
      return 'bg-red-500 text-white';
    case 'VU':
      return 'bg-orange-500 text-white';
    case 'NT':
      return 'bg-yellow-400 text-black';
    case 'LC':
      return 'bg-green-600 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
}