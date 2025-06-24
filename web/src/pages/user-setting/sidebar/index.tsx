import { Domain } from '@/constants/common';
import { useTranslate } from '@/hooks/common-hooks';
import { useLogout } from '@/hooks/login-hooks';
import { useSecondPathName } from '@/hooks/route-hook';
import {
  useFetchCurrentUser,
  useFetchSystemVersion,
} from '@/hooks/user-setting-hooks';
import type { MenuProps } from 'antd';
import { Flex, Menu } from 'antd';
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'umi';
import {
  UserAdminSettingIconMap,
  UserSettingBaseKey,
  UserSettingIconMap,
  UserSettingRouteKey,
} from '../constants';
import styles from './index.less';

type MenuItem = Required<MenuProps>['items'][number];

const SideBar = () => {
  const navigate = useNavigate();
  const pathName = useSecondPathName();
  const { logout } = useLogout();
  const { t } = useTranslate('setting');
  const { version, fetchSystemVersion } = useFetchSystemVersion();
  const { data: userInfo } = useFetchCurrentUser();
  const isSuperuser = userInfo?.data.data.is_superuser;

  useEffect(() => {
    if (location.host !== Domain) {
      fetchSystemVersion();
    }
  }, [fetchSystemVersion]);

  function getItem(
    label: string,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
  ): MenuItem {
    return {
      key,
      icon,
      children,
      label: (
        <Flex justify={'space-between'}>
          {t(label)}
          <span className={styles.version}>
            {label === 'system' && version}
          </span>
        </Flex>
      ),
      type,
    } as MenuItem;
  }

  let items: MenuItem[] = Object.values(UserSettingRouteKey).map((value) =>
    getItem(value, value, UserSettingIconMap[value]),
  );

  if (isSuperuser) {
    items = [
      ...items,
      getItem('object', 'object', UserAdminSettingIconMap['object']),
    ];
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === UserSettingRouteKey.Logout) {
      logout();
    } else {
      navigate(`/${UserSettingBaseKey}/${key}`);
    }
  };

  const selectedKeys = useMemo(() => {
    return [pathName];
  }, [pathName]);

  return (
    <section className={styles.sideBarWrapper}>
      <Menu
        selectedKeys={selectedKeys}
        mode="inline"
        items={items}
        onClick={handleMenuClick}
        style={{ width: 312 }}
      />
    </section>
  );
};

export default SideBar;
