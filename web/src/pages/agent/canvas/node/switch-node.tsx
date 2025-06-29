import { IconFont } from '@/components/icon-font';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent } from '@/components/ui/card';
import { ISwitchCondition, ISwitchNode } from '@/interfaces/database/flow';
import { Handle, NodeProps, Position } from '@xyflow/react';
import classNames from 'classnames';
import { memo, useCallback } from 'react';
import { SwitchOperatorOptions } from '../../constant';
import { useGetComponentLabelByValue } from '../../hooks/use-get-begin-query';
import { RightHandleStyle } from './handle-icon';
import { useBuildSwitchHandlePositions } from './hooks';
import styles from './index.less';
import NodeHeader, { ToolBar } from './node-header';

const getConditionKey = (idx: number, length: number) => {
  if (idx === 0 && length !== 1) {
    return 'If';
  } else if (idx === length - 1) {
    return 'Else';
  }

  return 'ElseIf';
};

const ConditionBlock = ({
  condition,
  nodeId,
}: {
  condition: ISwitchCondition;
  nodeId: string;
}) => {
  const items = condition?.items ?? [];
  const getLabel = useGetComponentLabelByValue(nodeId);

  const renderOperatorIcon = useCallback((operator?: string) => {
    const name = SwitchOperatorOptions.find((x) => x.value === operator)?.icon;
    return <IconFont name={name!}></IconFont>;
  }, []);

  return (
    <Card>
      <CardContent className="p-0 divide-y divide-background-card">
        {items.map((x, idx) => (
          <div key={idx}>
            <section className="flex justify-between gap-2 items-center text-xs p-1">
              <div className="flex-1 truncate text-background-checked">
                {getLabel(x?.cpn_id)}
              </div>
              <span>{renderOperatorIcon(x?.operator)}</span>
              <div className="flex-1 truncate">{x?.value}</div>
            </section>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

function InnerSwitchNode({ id, data, selected }: NodeProps<ISwitchNode>) {
  const { positions } = useBuildSwitchHandlePositions({ data, id });
  const { theme } = useTheme();
  return (
    <ToolBar selected={selected}>
      <section
        className={classNames(
          styles.logicNode,
          theme === 'dark' ? styles.dark : '',
          {
            [styles.selectedNode]: selected,
          },
          'group/operator hover:bg-slate-100',
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          isConnectable
          className={styles.handle}
          id={'a'}
        ></Handle>
        <NodeHeader
          id={id}
          name={data.name}
          label={data.label}
          className={styles.nodeHeader}
        ></NodeHeader>
        <section className="gap-2.5 flex flex-col">
          {positions.map((position, idx) => {
            return (
              <div key={idx}>
                <section className="flex flex-col">
                  <div className="flex justify-between">
                    <span className="text-text-sub-title text-xs translate-y-2">
                      {idx < positions.length - 1 &&
                        position.condition?.logical_operator?.toUpperCase()}
                    </span>
                    <span>{getConditionKey(idx, positions.length)}</span>
                  </div>
                  {position.condition && (
                    <ConditionBlock
                      nodeId={id}
                      condition={position.condition}
                    ></ConditionBlock>
                  )}
                </section>
                <Handle
                  key={position.text}
                  id={position.text}
                  type="source"
                  position={Position.Right}
                  isConnectable
                  className={styles.handle}
                  style={{ ...RightHandleStyle, top: position.top }}
                ></Handle>
              </div>
            );
          })}
        </section>
      </section>
    </ToolBar>
  );
}

export const SwitchNode = memo(InnerSwitchNode);
