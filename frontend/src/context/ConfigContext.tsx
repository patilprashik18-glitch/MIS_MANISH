import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface UILayoutItem {
  id?: number;
  section_key: string;
  field_key: string;
  display_label: string;
  is_visible: boolean;
  display_order: number;
}

export interface SectionPermission {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  source?: string;
}

interface ConfigContextType {
  uiLayouts: UILayoutItem[];
  myPermissions: Record<string, SectionPermission>;
  isSuperAdmin: boolean;
  visualCustomizerMode: boolean;
  setVisualCustomizerMode: (mode: boolean) => void;
  getLabel: (sectionKey: string, fieldKey: string, defaultLabel: string) => string;
  isFieldVisible: (sectionKey: string, fieldKey: string, defaultVisible?: boolean) => boolean;
  canEditSection: (sectionKey: string) => boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [uiLayouts, setUiLayouts] = useState<UILayoutItem[]>([]);
  const [myPermissions, setMyPermissions] = useState<Record<string, SectionPermission>>({});
  const [visualCustomizerMode, setVisualCustomizerMode] = useState(false);

  const isSuperAdmin = Boolean(user && user.role === 'admin');

  const refreshConfig = useCallback(async () => {
    if (!token) return;
    try {
      const [layoutRes, permRes] = await Promise.all([
        fetch('http://localhost:5000/api/config/ui-layout', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/config/permissions', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (layoutRes.ok) {
        const layoutData = await layoutRes.json();
        if (Array.isArray(layoutData)) {
          setUiLayouts(layoutData);
        }
      }

      if (permRes.ok) {
        const permData = await permRes.json();
        if (permData.myPermissions) {
          setMyPermissions(permData.myPermissions);
        }
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  }, [token]);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const getLabel = useCallback(
    (sectionKey: string, fieldKey: string, defaultLabel: string) => {
      const item = uiLayouts.find(
        (l) => l.section_key === sectionKey && l.field_key === fieldKey
      );
      return item ? item.display_label : defaultLabel;
    },
    [uiLayouts]
  );

  const isFieldVisible = useCallback(
    (sectionKey: string, fieldKey: string, defaultVisible = true) => {
      const item = uiLayouts.find(
        (l) => l.section_key === sectionKey && l.field_key === fieldKey
      );
      return item ? item.is_visible : defaultVisible;
    },
    [uiLayouts]
  );

  const canEditSection = useCallback(
    (sectionKey: string) => {
      if (isSuperAdmin) return true;
      const perm = myPermissions[sectionKey];
      if (!perm) return true; // default fallback if permission not configured
      return perm.canUpdate;
    },
    [isSuperAdmin, myPermissions]
  );

  return (
    <ConfigContext.Provider
      value={{
        uiLayouts,
        myPermissions,
        isSuperAdmin,
        visualCustomizerMode,
        setVisualCustomizerMode,
        getLabel,
        isFieldVisible,
        canEditSection,
        refreshConfig
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
