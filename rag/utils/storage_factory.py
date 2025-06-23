#
#  Copyright 2025 The InfiniFlow Authors. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

import os
from enum import Enum

import logging

from rag.utils.azure_sas_conn import RAGFlowAzureSasBlob
from rag.utils.azure_spn_conn import RAGFlowAzureSpnBlob
from rag.utils.minio_conn import RAGFlowMinio
from rag.utils.opendal_conn import OpenDALStorage
from rag.utils.s3_conn import RAGFlowS3
from rag.utils.oss_conn import RAGFlowOSS
from api.db.services.storage_config_service import StorageConfigService


class Storage(Enum):
    MINIO = 1
    AZURE_SPN = 2
    AZURE_SAS = 3
    AWS_S3 = 4
    OSS = 5
    OPENDAL = 6

class StorageProviderRegistry:
    """Registry for all storage providers with lazy initialization"""
    _providers = {
        "MINIO": None,
        "AZURE_SPN": None,
        "AZURE_SAS": None,
        "S3": None,
        "OSS": None,
        "OPENDAL": None 
    }
    
    _classes = {
        "MINIO": RAGFlowMinio,
        "AZURE_SPN": RAGFlowAzureSpnBlob,
        "AZURE_SAS": RAGFlowAzureSasBlob,
        "S3": RAGFlowS3,
        "OSS": RAGFlowOSS,
        "OPENDAL": OpenDALStorage
    }
    
    @classmethod
    def get_provider(cls, provider_type: str):
        """Get provider instance with lazy initialization"""
        if provider_type not in cls._providers:
            raise ValueError(f"Unsupported storage type: {provider_type}")
            
        # Initialize if not created yet
        if cls._providers[provider_type] is None:
                cls._providers[provider_type] = cls._classes[provider_type]()
                logging.info(f"Initialized {provider_type} storage provider")
            
        return cls._providers[provider_type]
    
    @classmethod
    def reset_providers(cls):
        """Reset all providers (for testing)"""
        for key in cls._providers:
            cls._providers[key] = None

class StorageFactory:
    storage_mapping = {
        Storage.MINIO: RAGFlowMinio,
        Storage.AZURE_SPN: RAGFlowAzureSpnBlob,
        Storage.AZURE_SAS: RAGFlowAzureSasBlob,
        Storage.AWS_S3: RAGFlowS3,
        Storage.OSS: RAGFlowOSS,
        Storage.OPENDAL: OpenDALStorage
    }

    @classmethod
    def create(cls, storage: Storage):
        return cls.storage_mapping[storage]()

    @staticmethod
    def get_provider(tenant_id: str):
        config = StorageConfigService.get_provider_by(tenant_id)
        if not config:
            return StorageFactory.get_default_storage()
        
        storage_type = config['type']
        try:
            return StorageProviderRegistry.get_provider(storage_type) 
        except ValueError:
            logging.error(f"Unsupported storage type: {storage_type} for tenant {tenant_id}")
            return StorageFactory.get_default_storage()

    @staticmethod
    def get_default_storage():
        storage_impl_type = os.getenv('STORAGE_IMPL', 'MINIO')
        try:
            return StorageProviderRegistry.get_provider(storage_impl_type)
        except ValueError:
            logging.error(f"Unsupported default storage type: {storage_impl_type}")
            return StorageProviderRegistry.get_provider("MINIO")


# STORAGE_IMPL_TYPE = os.getenv('STORAGE_IMPL', 'MINIO')
# STORAGE_IMPL = StorageFactory.create(Storage[STORAGE_IMPL_TYPE])
STORAGE_IMPL_TYPE = os.getenv('STORAGE_IMPL', 'MINIO')
try:
    STORAGE_IMPL = StorageFactory.get_default_storage()
except ValueError as e:
    logging.error("Failed to initialize default storage: {e}")
    STORAGE_IMPL = RAGFlowMinio()
