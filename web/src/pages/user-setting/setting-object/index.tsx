import { Authorization } from '@/constants/authorization';
import { useTranslate } from '@/hooks/common-hooks';
import {
  useFetchCurrentUser,
  useSaveSetting,
} from '@/hooks/user-setting-hooks';
import { getAuthorization } from '@/utils/authorization-util';
import { useQuery } from '@tanstack/react-query';
import { Button, Divider, Form, Select, Space, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import SettingTitle from '../components/setting-title';
import styles from './index.less';

const { Option } = Select;

// Định nghĩa các loại storage provider
const StorageProviders = ['S3', 'AZURE', 'OSS', 'MINIO'] as const;
type StorageProvider = (typeof StorageProviders)[number];

// Cấu trúc dữ liệu cho form
type StorageConfigType = {
  provider?: StorageProvider;
  userId?: string; // Thêm trường userId
};

const tailLayout = {
  wrapperCol: { offset: 20, span: 4 },
};

const ObjectStorageSetting = () => {
  const { saveSetting, loading: submitLoading } = useSaveSetting();
  const [form] = Form.useForm();
  const { t } = useTranslate('setting');
  const [loading, setLoading] = useState(true);
  const [initialProvider, setInitialProvider] =
    useState<StorageProvider>('MINIO');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // State để lưu user được chọn

  // Lấy thông tin user hiện tại để kiểm tra superuser
  const { data: currentUser } = useFetchCurrentUser();
  const isSuperuser = currentUser?.data.data.is_superuser;

  // Fetch danh sách non-superuser (chỉ khi là superuser)
  const { data: nonSuperUsers, isLoading: nonSuperUsersLoading } = useQuery({
    queryKey: ['nonSuperUsers'],
    queryFn: async () => {
      try {
        const response = await fetch('/v1/user/list_non_superusers', {
          headers: {
            [Authorization]: getAuthorization(),
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch non-superusers');
        const data = await response.json();

        if (data.code === 0 && Array.isArray(data.data)) {
          return data.data; // Trả về mảng users thực sự
        }

        if (Array.isArray(data)) {
          return data;
        }
      } catch (error) {
        message.error(t('fetchNonSuperUsersError'));
        return [];
      }
    },
    enabled: !!isSuperuser, // Chỉ fetch nếu là superuser
  });

  // Lấy thông tin storage provider hiện tại
  const { refetch: fetchStorage } = useQuery({
    queryKey: ['storageProvider', selectedUserId],
    queryFn: async () => {
      const userId = selectedUserId || currentUser?.id;
      try {
        const response = await fetch(`/v1/user/get_storage`, {
          method: 'POST',
          headers: {
            [Authorization]: getAuthorization(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch storage provider');
        const data = await response.json();
        return data.provider as StorageProvider;
      } catch (error) {
        message.error(t('fetchStorageError'));
        return 'MINIO';
      }
    },
    enabled: false,
  });

  // Hàm xử lý khi submit form
  const onFinish = async (values: StorageConfigType) => {
    setLoading(true);
    try {
      // Gọi API set_storage với user_id nếu có
      const requestBody = values.userId
        ? { provider: values.provider, user_id: values.userId }
        : { provider: values.provider };

      const response = await fetch('/v1/user/set_storage', {
        method: 'POST',
        headers: {
          [Authorization]: getAuthorization(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to save storage provider');

      const result = await response.json();
      if (result.code === 0) {
        message.success(t('saveSuccess'));
        setInitialProvider(values.provider!);
      } else {
        throw new Error(result.msg);
      }
    } catch (error: any) {
      message.error(t('saveError', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý khi hủy thay đổi
  const handleCancel = () => {
    form.resetFields();
    form.setFieldsValue({ provider: initialProvider });
  };

  // Hàm xử lý khi chọn user (chỉ dành cho superuser)
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    // Khi chọn user mới, reset form và fetch storage provider mới
    form.resetFields();
    setLoading(true);
    fetchStorage().then((provider) => {
      if (provider.data) {
        setInitialProvider(provider.data);
        form.setFieldsValue({ provider: provider.data });
      }
      setLoading(false);
    });
  };

  // Lấy thông tin storage provider khi component mount
  useEffect(() => {
    const fetchInitialStorage = async () => {
      try {
        const provider = await fetchStorage();
        if (provider) {
          setInitialProvider(provider);
          form.setFieldsValue({
            provider,
            userId: isSuperuser ? selectedUserId : undefined,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStorage();
  }, [form, fetchStorage, isSuperuser, selectedUserId]);

  return (
    <section className={styles.profileWrapper}>
      <SettingTitle
        title={t('objectStorage')}
        description={t('objectStorageDescription')}
      ></SettingTitle>
      <Divider />
      <Spin spinning={loading || (isSuperuser && nonSuperUsersLoading)}>
        <Form
          colon={false}
          name="storage-config"
          labelAlign={'left'}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ width: '100%' }}
          onFinish={onFinish}
          form={form}
          autoComplete="off"
        >
          {/* Dropdown chọn user (chỉ hiển thị cho superuser) */}
          {isSuperuser && (
            <Form.Item
              label={t('selectUser')}
              name="userId"
              rules={[{ required: true, message: t('selectUserMessage') }]}
            >
              <Select
                placeholder={t('selectUserPlaceholder')}
                onChange={handleUserChange}
              >
                {nonSuperUsers?.map((user) => (
                  <Option value={user.id} key={user.id}>
                    {user.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {/* Provider Selection */}
          <Form.Item<StorageConfigType>
            label={t('storageProvider')}
            name="provider"
            rules={[{ required: true, message: t('storageProviderMessage') }]}
          >
            <Select placeholder={t('selectProvider')}>
              {StorageProviders.map((provider) => (
                <Option value={provider} key={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item {...tailLayout}>
            <Space>
              <Button htmlType="button" onClick={handleCancel}>
                {t('cancel')}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading}
                disabled={form.getFieldValue('provider') === initialProvider}
              >
                {t('save', { keyPrefix: 'common' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </section>
  );
};

export default ObjectStorageSetting;
