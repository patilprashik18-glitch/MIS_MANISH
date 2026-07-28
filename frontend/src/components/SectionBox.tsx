import React, { useState } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';

interface SectionBoxProps {
  sectionKey: string;
  defaultTitle: string;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}

export default function SectionBox({
  sectionKey,
  defaultTitle,
  children,
  className = '',
  badge
}: SectionBoxProps) {
  const { token } = useAuth();
  const {
    getLabel,
    isFieldVisible,
    myPermissions,
    isSuperAdmin,
    visualCustomizerMode,
    refreshConfig
  } = useConfig();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const displayTitle = getLabel(sectionKey, `${sectionKey}_title`, defaultTitle);
  const isVisible = isFieldVisible(sectionKey, `${sectionKey}_title`, true);
  const perm = myPermissions[sectionKey];

  // If not visible and not in customizer mode, hide entire section
  if (!isVisible && !visualCustomizerMode) {
    return null;
  }

  // Check read permission
  const canRead = isSuperAdmin || !perm || perm.canRead !== false;
  const canUpdate = isSuperAdmin || !perm || perm.canUpdate !== false;

  const handleSaveCustomization = async (hide: boolean = false) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/config/ui-layout', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          section_key: sectionKey,
          field_key: `${sectionKey}_title`,
          display_label: newTitle || displayTitle,
          is_visible: !hide,
          display_order: 1
        })
      });
      if (res.ok) {
        setEditModalOpen(false);
        await refreshConfig();
      } else {
        alert('Failed to save customization');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving customization');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setNewTitle(displayTitle);
    setEditModalOpen(true);
  };

  return (
    <div
      className={`relative rounded-2xl transition-all ${
        visualCustomizerMode
          ? 'border-2 border-dashed border-amber-500 bg-amber-500/5 p-5 shadow-lg'
          : ''
      } ${className}`}
    >
      {/* SUPER ADMIN LIVE VISUAL CUSTOMIZER TOOLBAR */}
      {visualCustomizerMode && (
        <div className="flex items-center justify-between mb-3 bg-amber-500 text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">edit_square</span>
            <span>Customizer: {sectionKey}</span>
            {!isVisible && (
              <span className="bg-white text-amber-900 px-2 py-0.5 rounded text-[10px]">
                HIDDEN TO USERS
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openEditModal}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Rename Title / Toggle Hide
            </button>
          </div>
        </div>
      )}

      {/* SECTION HEADER & PERMISSIONS BANNER */}
      {!canRead ? (
        <div className="p-8 bg-surface-container-low rounded-2xl border border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2">
          <span className="material-symbols-outlined text-error text-3xl">lock</span>
          <h3 className="font-bold text-on-surface">{displayTitle}</h3>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Access to this module is restricted by role permissions. Contact Super Admin to request view privileges.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-on-surface">{displayTitle}</h3>
              {badge && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              {!canUpdate && !isSuperAdmin && (
                <span className="text-xs font-bold bg-amber-500/10 text-amber-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                  <span className="material-symbols-outlined text-xs">visibility</span>
                  Read-Only Mode
                </span>
              )}
            </div>
          </div>

          {/* Render Children (the table or form controls) */}
          <div className={!canUpdate && !isSuperAdmin ? 'opacity-90' : ''}>
            {children}
          </div>
        </>
      )}

      {/* EDIT MODAL FOR TITLE/VISIBILITY */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/40 space-y-4">
            <h4 className="text-base font-bold text-on-surface">Customize Section Title & Visibility</h4>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                Section Display Label
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                onClick={() => handleSaveCustomization(true)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-error/10 text-error hover:bg-error/20"
              >
                {isVisible ? 'Hide Section' : 'Unhide Section'}
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCustomization(false)}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-md hover:bg-primary/90"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
