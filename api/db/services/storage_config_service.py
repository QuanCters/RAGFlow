from collections import deque
from datetime import datetime
import logging
from api.db.db_models import StorageConfig, File, DB, Tenant, UserTenant
from api.db import FileType
from api.db.services.common_service import CommonService
from api.utils import current_timestamp, datetime_format

class StorageConfigService(CommonService):
    """Service class for managing provider-related database operations.

    This class extends CommonService to provide functionality for provider management,
    including storage information retrieval and provider management.

    Attributes:
        model: The StorageConfig model class for database operations.
    """
    model = StorageConfig

    @classmethod
    @DB.connection_context()
    def get_provider_by(cls, user_id):
        """get storage config of tenant

        Args:
            user_id : User ID 
        
        Returns:
            dict: Storage config or None
        """
        try:
            storage_config = cls.model.select(
                cls.model.provider,
                cls.model.config
            ).where(
                (cls.model.user_id == user_id)
            ).dicts().get()

            if not storage_config.get("provider"):
                return None

            return {
                'type': storage_config['provider'],
                'settings': storage_config['config'] or {}
            }
        except cls.model.DoesNotExist:
            return None 

    @classmethod
    @DB.connection_context()
    def update_provider(cls, user_id, provider, config = None):
        """Update storage config and provider

        Args:
            user_id: User ID
            provider: storage type (AZURE, AWS, MINIO, OSS)
            config: specific config of provider
        """  
        update_data = {
            "provider": provider,
            "config": config
        }

        cls.model.update(update_data).where(
            (cls.model.user_id == user_id)
        ).execute()

    @classmethod
    @DB.connection_context()
    def insert(cls, storage_config):
        """Insert a new storage config record
        Args:
            storage_config: Config data dictionary
        Returns:
            Created config object
        """
        if not cls.save(**storage_config):
            raise RuntimeError("Database error (StorageConfig)!")
        return StorageConfig(**storage_config)

    
    @classmethod
    @DB.connection_context()
    def update_by_id(cls, pid, data):
        data["update_time"] = current_timestamp()
        data["update_date"] = datetime_format(datetime.now())
        num = cls.model.update(data).where(cls.model.user_id == pid).execute()
        return num

    @classmethod
    @DB.connection_context()
    def migrate_user_files(cls, user_id, from_provider, to_provider):
        from rag.utils.storage_factory import StorageProviderRegistry 
        try:
            items = File.select().where(
                (File.created_by == user_id) | 
                (File.tenant_id.in_(
                    Tenant.select(Tenant.id).where(
                        UserTenant.select(UserTenant.tenant_id).where(
                            UserTenant.user_id == user_id  
                            ) 
                        )
                    )
                )
            ) 

            folders = [item for item in items if item.type == FileType.FOLDER.value]            
            files = [item for item in items if item.type != FileType.FOLDER.value]            

            from_client = StorageProviderRegistry.get_provider(from_provider)
            to_client = StorageProviderRegistry.get_provider(to_provider)

            service = cls()
            service.migrate_folders(folders, from_client, to_client)

            for file in files:
                service.migrate_file(file, from_client, to_client)
        except Exception as e:
            raise
    
    def migrate_file(cls, file: File, from_client, to_client):
        try:
            file_data = from_client.get(file.parent_id, file.location)
            to_client.put(file.parent_id, file.location, file_data)
            if not to_client.obj_exist(file.parent_id, file.location):
                raise Exception(f"File verification failed: {file.id}")
        except Exception as e:
            logging.error(f"Migration failed for file {file.id}: {str(e)}")
            raise
    
    def migrate_folders(cls, folders, from_client, to_client):
        sorted_folders = cls.sort_folders_by_depth(folders)

        for folder in sorted_folders:
            to_client.create_folder(folder.parent_id, folder.location) 
    
    def sort_folders_by_depth(cls, folders):
        if not folders:
            return []

        folder_map = {f.id: f for f in folders}
        children_map = {}

        for folder in folders:
            if folder.parent_id in folder_map:
                children_map[folder.parent_id] = []
            children_map[folder.parent_id].append(folder.id)
        
        roots = [f for f in folders if not f.parent_id or f.parent_id not in folder_map]
        
        sorted_folders = []
        queue = deque(roots)
        processed = set()
        
        while queue:
            folder_id = queue.popleft()
            
            if folder_id in processed or folder_id not in folder_map:
                continue

            folder = folder_map[folder_id]
            sorted_folders.append(folder)
            processed.add(folder_id)
            
            if folder_id in children_map:
                for child_id in children_map[folder_id]:
                    if child_id not in processed:
                        queue.append(child_id)
        
        for folder in folders:
            if folder.id not in processed:
                sorted_folders.append(folder)
                processed.add(folder.id)

        return sorted_folders
