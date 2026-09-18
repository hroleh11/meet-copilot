import { uk } from '~/shared/i18n/uk';
import type { Usage } from '~/shared/ipc';
import { formatDuration, formatMoney, formatNumber } from '~/shared/lib/format';
import { estimateCost } from './cost';

export interface UsageSummaryProps {
  usage: Usage;
}

export function UsageSummary({ usage }: UsageSummaryProps) {
  const rows = [
    { label: uk.history.audio, value: formatDuration(usage.audioSeconds) },
    {
      label: uk.history.tokensIn,
      value: `${formatNumber(usage.inputTokens)} (${uk.history.tokensCached} ${formatNumber(usage.cachedInputTokens)})`,
    },
    { label: uk.history.tokensOut, value: formatNumber(usage.outputTokens) },
    { label: uk.history.approximateCost, value: formatMoney(estimateCost(usage)) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3">
          <dt className="text-ink-tertiary">{row.label}</dt>
          <dd className="text-ink-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
