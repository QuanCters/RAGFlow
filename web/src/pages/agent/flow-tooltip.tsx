import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export const RunTooltip = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{t('flow.testRun')}</p>
      </TooltipContent>
    </Tooltip>
  );
};
