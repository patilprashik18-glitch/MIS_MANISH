import express from 'express';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ==========================================
// 1. DASHBOARD CHARTS CONFIGURATION
// ==========================================
router.get('/dashboard-charts', async (req, res) => {
  try {
    const charts = await db('dashboard_chart_config').orderBy('display_order', 'asc');
    res.json(charts);
  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/dashboard-charts', isAdmin, async (req, res) => {
  try {
    const { charts } = req.body;
    if (!Array.isArray(charts)) {
      return res.status(400).json({ error: 'charts array is required' });
    }

    for (const chart of charts) {
      if (chart.chart_key) {
        await db('dashboard_chart_config')
          .where({ chart_key: chart.chart_key })
          .update({
            is_visible: Boolean(chart.is_visible),
            display_order: Number(chart.display_order || 1)
          });
      }
    }

    const updated = await db('dashboard_chart_config').orderBy('display_order', 'asc');
    res.json(updated);
  } catch (error) {
    console.error('Error updating dashboard charts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 2. SECTION-WISE CRUD PERMISSIONS
// ==========================================
router.get('/permissions', async (req, res) => {
  try {
    const roles = await db('role_permissions').select('*');
    const overrides = await db('user_permissions_override').select('*');

    // Compute myPermissions for the current user
    const userRole = req.user.role || 'mill_floor';
    const userId = req.user.id || req.user.userId;

    const sections = [
      'grinding_power', 'wheat_stock', 'finish_stock', 'todays_production',
      'sales_report', 'sales_pending', 'salesman_sales', 'attendance',
      'moisture', 'lab_report', 'padtal_report', 'master_data'
    ];

    const myPermissions = {};
    for (const sec of sections) {
      // 1. Check override
      const override = overrides.find(o => o.user_id == userId && o.section_key === sec);
      if (override) {
        myPermissions[sec] = {
          canCreate: Boolean(override.can_create),
          canRead: Boolean(override.can_read),
          canUpdate: Boolean(override.can_update),
          canDelete: Boolean(override.can_delete),
          source: 'override'
        };
      } else {
        // 2. Check role
        const rolePerm = roles.find(r => r.role_name === userRole && r.section_key === sec);
        if (rolePerm) {
          myPermissions[sec] = {
            canCreate: Boolean(rolePerm.can_create),
            canRead: Boolean(rolePerm.can_read),
            canUpdate: Boolean(rolePerm.can_update),
            canDelete: Boolean(rolePerm.can_delete),
            source: 'role'
          };
        } else {
          // Default fallback
          const isAdminRole = userRole === 'admin';
          myPermissions[sec] = {
            canCreate: isAdminRole,
            canRead: true,
            canUpdate: isAdminRole,
            canDelete: isAdminRole,
            source: 'default'
          };
        }
      }
    }

    res.json({
      roles,
      overrides,
      myPermissions,
      isSuperAdmin: userRole === 'admin'
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/permissions/role', isAdmin, async (req, res) => {
  try {
    const { role_name, section_key, can_create, can_read, can_update, can_delete } = req.body;
    if (!role_name || !section_key) {
      return res.status(400).json({ error: 'role_name and section_key are required' });
    }

    const existing = await db('role_permissions')
      .where({ role_name, section_key })
      .first();

    if (existing) {
      await db('role_permissions')
        .where({ id: existing.id })
        .update({
          can_create: Boolean(can_create),
          can_read: Boolean(can_read),
          can_update: Boolean(can_update),
          can_delete: Boolean(can_delete)
        });
    } else {
      await db('role_permissions').insert({
        role_name,
        section_key,
        can_create: Boolean(can_create),
        can_read: Boolean(can_read),
        can_update: Boolean(can_update),
        can_delete: Boolean(can_delete)
      });
    }

    const allRoles = await db('role_permissions').select('*');
    res.json(allRoles);
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/permissions/user', isAdmin, async (req, res) => {
  try {
    const { user_id, section_key, can_create, can_read, can_update, can_delete } = req.body;
    if (!user_id || !section_key) {
      return res.status(400).json({ error: 'user_id and section_key are required' });
    }

    const existing = await db('user_permissions_override')
      .where({ user_id, section_key })
      .first();

    if (existing) {
      await db('user_permissions_override')
        .where({ id: existing.id })
        .update({
          can_create: Boolean(can_create),
          can_read: Boolean(can_read),
          can_update: Boolean(can_update),
          can_delete: Boolean(can_delete)
        });
    } else {
      await db('user_permissions_override').insert({
        user_id,
        section_key,
        can_create: Boolean(can_create),
        can_read: Boolean(can_read),
        can_update: Boolean(can_update),
        can_delete: Boolean(can_delete)
      });
    }

    const overrides = await db('user_permissions_override').select('*');
    res.json(overrides);
  } catch (error) {
    console.error('Error updating user override permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/permissions/user/:userId/:sectionKey', isAdmin, async (req, res) => {
  try {
    const { userId, sectionKey } = req.params;
    await db('user_permissions_override')
      .where({ user_id: userId, section_key: sectionKey })
      .del();
    const overrides = await db('user_permissions_override').select('*');
    res.json(overrides);
  } catch (error) {
    console.error('Error deleting user override:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 3. UI LAYOUT & FIELD CONFIGURATION
// ==========================================
router.get('/ui-layout', async (req, res) => {
  try {
    const layouts = await db('ui_layout_config').orderBy(['section_key', 'display_order']);
    res.json(layouts);
  } catch (error) {
    console.error('Error fetching ui layout config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/ui-layout', isAdmin, async (req, res) => {
  try {
    const { section_key, field_key, display_label, is_visible, display_order } = req.body;
    if (!section_key || !field_key || !display_label) {
      return res.status(400).json({ error: 'section_key, field_key, and display_label are required' });
    }

    const existing = await db('ui_layout_config')
      .where({ section_key, field_key })
      .first();

    if (existing) {
      await db('ui_layout_config')
        .where({ id: existing.id })
        .update({
          display_label: String(display_label),
          is_visible: Boolean(is_visible ?? existing.is_visible),
          display_order: Number(display_order || existing.display_order || 1)
        });
    } else {
      await db('ui_layout_config').insert({
        section_key,
        field_key,
        display_label: String(display_label),
        is_visible: Boolean(is_visible ?? true),
        display_order: Number(display_order || 1)
      });
    }

    const layouts = await db('ui_layout_config').orderBy(['section_key', 'display_order']);
    res.json(layouts);
  } catch (error) {
    console.error('Error updating ui layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/ui-layout/batch', isAdmin, async (req, res) => {
  try {
    const { layouts } = req.body;
    if (!Array.isArray(layouts)) {
      return res.status(400).json({ error: 'layouts array is required' });
    }

    for (const item of layouts) {
      if (item.section_key && item.field_key) {
        const existing = await db('ui_layout_config')
          .where({ section_key: item.section_key, field_key: item.field_key })
          .first();

        if (existing) {
          await db('ui_layout_config')
            .where({ id: existing.id })
            .update({
              display_label: String(item.display_label || existing.display_label),
              is_visible: Boolean(item.is_visible ?? existing.is_visible),
              display_order: Number(item.display_order || existing.display_order || 1)
            });
        } else {
          await db('ui_layout_config').insert({
            section_key: item.section_key,
            field_key: item.field_key,
            display_label: String(item.display_label || item.field_key),
            is_visible: Boolean(item.is_visible ?? true),
            display_order: Number(item.display_order || 1)
          });
        }
      }
    }

    const updated = await db('ui_layout_config').orderBy(['section_key', 'display_order']);
    res.json(updated);
  } catch (error) {
    console.error('Error batch updating ui layout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
