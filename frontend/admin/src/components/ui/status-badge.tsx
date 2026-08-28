import * as React from 'react';
import { Badge } from './badge';

type StatusType = 'confirmed' | 'pending' | 'cancelled' | 'done' | 'scheduled' | 'no_show' | string;

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'secondary' }> = {
  confirmed:  { label: 'Confirmado',  variant: 'success' },
  done:       { label: 'Realizado',   variant: 'success' },
  scheduled:  { label: 'Agendado',    variant: 'info' },
  pending:    { label: 'Aguardando',  variant: 'warning' },
  cancelled:  { label: 'Cancelado',   variant: 'danger' },
  no_show:    { label: 'Não compareceu', variant: 'danger' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export { StatusBadge };
