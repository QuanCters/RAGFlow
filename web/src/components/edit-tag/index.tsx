import { PlusOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import { Input, Tag, theme, Tooltip } from 'antd';
import { TweenOneGroup } from 'rc-tween-one';
import React, { useEffect, useRef, useState } from 'react';

import styles from './index.less';

interface EditTagsProps {
  value?: string[];
  onChange?: (tags: string[]) => void;
}

const EditTag = ({ value = [], onChange }: EditTagsProps) => {
  const { token } = theme.useToken();
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const handleClose = (removedTag: string) => {
    const newTags = value?.filter((tag) => tag !== removedTag);
    onChange?.(newTags ?? []);
  };

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && value) {
      const newTags = inputValue
        .split(';')
        .map((tag) => tag.trim())
        .filter((tag) => tag && !value.includes(tag));
      onChange?.([...value, ...newTags]);
    }
    setInputVisible(false);
    setInputValue('');
  };

  const forMap = (tag: string) => {
    return (
      <Tooltip title={tag}>
        <Tag
          key={tag}
          className={styles.tag}
          closable
          onClose={(e) => {
            e.preventDefault();
            handleClose(tag);
          }}
        >
          {tag}
        </Tag>
      </Tooltip>
    );
  };

  const tagChild = value?.map(forMap);

  const tagPlusStyle: React.CSSProperties = {
    background: token.colorBgContainer,
    borderStyle: 'dashed',
  };

  return (
    <div>
      {Array.isArray(tagChild) && tagChild.length > 0 && (
        <TweenOneGroup
          className={styles.tweenGroup}
          enter={{
            scale: 0.8,
            opacity: 0,
            type: 'from',
            duration: 100,
          }}
          onEnd={(e) => {
            if (e.type === 'appear' || e.type === 'enter') {
              (e.target as any).style = 'display: inline-block';
            }
          }}
          leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
          appear={false}
        >
          {tagChild}
        </TweenOneGroup>
      )}
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      ) : (
        <Tag onClick={showInput} style={tagPlusStyle}>
          <PlusOutlined />
        </Tag>
      )}
    </div>
  );
};

export default EditTag;
