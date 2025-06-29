import { useFetchAgentListByPage } from '@/hooks/use-agent-request';
import { ApplicationCard } from './application-card';

export function Agents() {
  const { data } = useFetchAgentListByPage();

  return data
    .slice(0, 10)
    .map((x) => <ApplicationCard key={x.id} app={x}></ApplicationCard>);
}
