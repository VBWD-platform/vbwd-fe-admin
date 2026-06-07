/**
 * Admin Extension Registry
 *
 * Generic system for loading and accessing plugin extensions.
 * Keeps the core admin app agnostic to specific plugins.
 *
 * Supports:
 * - Plugin nav sections (standalone sidebar sections)
 * - Section items (inject into core sections like Sales, Settings)
 * - Hidden items (hide any core nav item by path)
 * - Section components (inject Vue components into sections)
 * - 3-level nav: L0 sections → L1 items → L2 children
 *
 * The internal map is wrapped with Vue's reactive() so that any computed()
 * reading from getNavSections() / buildSidebar() re-evaluates automatically
 * when plugins register or unregister.
 */

import { reactive } from 'vue';
import type { Component } from 'vue';

export interface NavItem {
  /** Display label */
  label: string;
  /** Absolute route path (e.g. '/admin/cms/pages') */
  to: string;
  /** Optional ID for targeting by other plugins (e.g. 'invoices') */
  id?: string;
  /** Optional Level 2 children — renders as expandable sub-group */
  children?: NavItem[];
  /** Permission required to see this nav item (checked by AdminSidebar) */
  requiredPermission?: string;
}

export interface NavItemWithPosition extends NavItem {
  /** Position hint: 'before:invoices', 'after:users', 'start', 'end' (default: 'end') */
  position?: string;
}

export interface NavSection {
  /** Unique ID (used as key and for active-state detection) */
  id: string;
  /** Section header label */
  label: string;
  /** Child nav items */
  items: NavItem[];
}

export interface PlanTabSection {
  /** Tab label */
  label: string;
  /** Component to render as tab content */
  component: Component;
  /** Optional: only show when plan has a category with one of these slugs */
  requiredCategorySlugs?: string[];
}

export interface SectionComponent {
  component: Component;
  position?: 'before' | 'after';
}

export interface AccessLevelTab {
  /** Unique tab ID */
  id: string;
  /** Tab label */
  label: string;
  /** Component to render as tab content */
  component: Component;
  /** Permission required to see this tab */
  requiredPermission?: string;
}

export interface UserEditTab {
  /** Unique tab ID (also the activeTab value, e.g. 'subscriptions') */
  id: string;
  /** Tab button label (already human-readable; plugin owns its i18n) */
  label: string;
  /**
   * Tab content component. Receives two props:
   *  - `userId: string`  — the user being edited
   *  - `active: boolean` — whether this tab is currently shown (lazy-load hint)
   */
  component: Component;
  /** Ordering hint among plugin tabs (lower = earlier; default 100) */
  order?: number;
  /** Permission required to see this tab */
  requiredPermission?: string;
}

export interface AccessLevelUserColumn {
  /** Unique column id */
  id: string;
  /** Column header label (plugin owns its i18n) */
  header: string;
  /** Cell component, rendered per row with a `level` prop (the user access level) */
  component: Component;
}

export interface AccessLevelFormField {
  /** Component to render as form field */
  component: Component;
  /** Only show on user access level forms (type=user) */
  userOnly?: boolean;
  /** Permission required to see this field */
  requiredPermission?: string;
  /**
   * Names of the form keys this field owns. The core Access Level form uses
   * these to load the values from the entity, seed defaults, and include them
   * in the save payload — generically, without naming any plugin field.
   */
  fields?: string[];
}

export interface DataExchangeTabExtension {
  /** Unique tab ID (also the active-tab value) */
  id: string;
  /** Tab button label (plugin owns its i18n) */
  label: string;
  /** Tab content component, rendered inside the Import/Export page */
  component: Component;
  /** Static props passed to the component */
  props?: Record<string, unknown>;
  /** Ordering hint among contributed tabs (lower = earlier; default 100) */
  order?: number;
  /** Permission required to see this tab (R12 gating) */
  requiredPermission?: string;
}

export interface AdminExtension {
  userDetailsSections?: Component[];
  /** Sections rendered on the core Invoice Details page (receive `:invoice`) */
  invoiceDetailSections?: Component[];
  /** Nav sections added to the admin sidebar by this plugin */
  navSections?: NavSection[];
  /** Items injected into the core Settings nav section (deprecated — use sectionItems.settings) */
  settingsItems?: NavItem[];
  /** Plan edit page tab sections contributed by this plugin */
  planTabSections?: PlanTabSection[];
  /** Inject items into core sections by section ID */
  sectionItems?: Record<string, NavItemWithPosition[]>;
  /** Hide core nav items by route path */
  hiddenItems?: string[];
  /** Inject Vue components into sections */
  sectionComponents?: Record<string, SectionComponent[]>;
  /** Additional tabs on the Access Levels page */
  accessLevelTabs?: AccessLevelTab[];
  /** Additional form fields on the Access Level form */
  accessLevelFormFields?: AccessLevelFormField[];
  /** Additional columns on the user Access Levels table (e.g. Linked Plan) */
  accessLevelUserColumns?: AccessLevelUserColumn[];
  /** Additional tabs on the User Edit page (e.g. Subscriptions, Add-ons) */
  userEditTabs?: UserEditTab[];
  /** Additional tabs on the Settings → Import/Export page (R7, S46.4) */
  dataExchangeTabs?: DataExchangeTabExtension[];
}

class ExtensionRegistry {
  private extensions: Map<string, AdminExtension> = reactive(new Map());

  register(pluginName: string, extension: AdminExtension): void {
    this.extensions.set(pluginName, extension);
  }

  unregister(pluginName: string): void {
    this.extensions.delete(pluginName);
  }

  // ── Existing methods (unchanged API) ─────────────────────────────────

  getUserDetailsSections(): Component[] {
    const sections: Component[] = [];
    this.extensions.forEach((ext) => {
      if (ext.userDetailsSections) {
        sections.push(...ext.userDetailsSections);
      }
    });
    return sections;
  }

  getInvoiceDetailSections(): Component[] {
    const sections: Component[] = [];
    this.extensions.forEach((ext) => {
      if (ext.invoiceDetailSections) {
        sections.push(...ext.invoiceDetailSections);
      }
    });
    return sections;
  }

  getNavSections(): NavSection[] {
    const all: NavSection[] = [];
    this.extensions.forEach((ext) => {
      if (ext.navSections) {
        all.push(...ext.navSections);
      }
    });
    return all;
  }

  getSettingsItems(): NavItem[] {
    const items: NavItem[] = [];
    this.extensions.forEach((ext) => {
      if (ext.settingsItems) {
        items.push(...ext.settingsItems);
      }
    });
    return items;
  }

  getPlanTabSections(): PlanTabSection[] {
    const sections: PlanTabSection[] = [];
    this.extensions.forEach((ext) => {
      if (ext.planTabSections) {
        sections.push(...ext.planTabSections);
      }
    });
    return sections;
  }

  getAccessLevelTabs(): AccessLevelTab[] {
    const tabs: AccessLevelTab[] = [];
    this.extensions.forEach((ext) => {
      if (ext.accessLevelTabs) {
        tabs.push(...ext.accessLevelTabs);
      }
    });
    return tabs;
  }

  getAccessLevelFormFields(): AccessLevelFormField[] {
    const fields: AccessLevelFormField[] = [];
    this.extensions.forEach((ext) => {
      if (ext.accessLevelFormFields) {
        fields.push(...ext.accessLevelFormFields);
      }
    });
    return fields;
  }

  getUserEditTabs(): UserEditTab[] {
    const tabs: UserEditTab[] = [];
    this.extensions.forEach((ext) => {
      if (ext.userEditTabs) {
        tabs.push(...ext.userEditTabs);
      }
    });
    return tabs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  getAccessLevelUserColumns(): AccessLevelUserColumn[] {
    const columns: AccessLevelUserColumn[] = [];
    this.extensions.forEach((ext) => {
      if (ext.accessLevelUserColumns) {
        columns.push(...ext.accessLevelUserColumns);
      }
    });
    return columns;
  }

  getDataExchangeTabs(): DataExchangeTabExtension[] {
    const tabs: DataExchangeTabExtension[] = [];
    this.extensions.forEach((ext) => {
      if (ext.dataExchangeTabs) {
        tabs.push(...ext.dataExchangeTabs);
      }
    });
    return tabs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  get(pluginName: string): AdminExtension | undefined {
    return this.extensions.get(pluginName);
  }

  has(pluginName: string): boolean {
    return this.extensions.has(pluginName);
  }

  clear(): void {
    this.extensions.clear();
  }

  // ── New: Section slot system ─────────────────────────────────────────

  /**
   * Get items injected into a specific core section by plugins.
   */
  getSectionItems(sectionId: string): NavItemWithPosition[] {
    const items: NavItemWithPosition[] = [];
    this.extensions.forEach((ext) => {
      if (ext.sectionItems && ext.sectionItems[sectionId]) {
        items.push(...ext.sectionItems[sectionId]);
      }
    });
    return items;
  }

  /**
   * Get all hidden item paths across all plugins.
   */
  getHiddenItems(): string[] {
    const hidden: string[] = [];
    this.extensions.forEach((ext) => {
      if (ext.hiddenItems) {
        hidden.push(...ext.hiddenItems);
      }
    });
    return hidden;
  }

  /**
   * Get components injected into a section.
   */
  getSectionComponents(sectionId: string): SectionComponent[] {
    const components: SectionComponent[] = [];
    this.extensions.forEach((ext) => {
      if (ext.sectionComponents && ext.sectionComponents[sectionId]) {
        components.push(...ext.sectionComponents[sectionId]);
      }
    });
    return components;
  }

  /**
   * Build complete sidebar model — merges core sections with plugin items.
   *
   * 1. Deep-clones core sections (never mutates original)
   * 2. Injects sectionItems into matching sections with position control
   * 3. Merges settingsItems into 'settings' section (backward compat)
   * 4. Filters out hiddenItems
   * 5. Appends plugin navSections after core sections
   *
   * @param coreSections - Core-defined sections (Sales, Settings, etc.)
   * @returns Merged sidebar model ready for rendering
   */
  buildSidebar(coreSections: NavSection[]): NavSection[] {
    // 1. Deep clone core sections
    const sections: NavSection[] = coreSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        children: item.children ? [...item.children] : undefined,
      })),
    }));

    // 2. Inject sectionItems into matching sections
    for (const section of sections) {
      const injectedItems = this.getSectionItems(section.id);
      for (const item of injectedItems) {
        this._insertItem(section.items, item);
      }
    }

    // 3. Backward compat: merge settingsItems into 'settings' section
    const settingsSection = sections.find((s) => s.id === 'settings');
    if (settingsSection) {
      const legacyItems = this.getSettingsItems();
      for (const item of legacyItems) {
        settingsSection.items.push({ ...item });
      }
    }

    // 4. Filter hidden items
    const hidden = new Set(this.getHiddenItems());
    for (const section of sections) {
      section.items = section.items.filter((item) => !hidden.has(item.to));
    }

    // 5. Append plugin standalone navSections
    const pluginSections = this.getNavSections();
    for (const pluginSection of pluginSections) {
      sections.push({
        ...pluginSection,
        items: pluginSection.items.map((item) => ({
          ...item,
          children: item.children ? [...item.children] : undefined,
        })),
      });
    }

    return sections;
  }

  /**
   * Insert an item into a section's items array based on position hint.
   */
  private _insertItem(items: NavItem[], newItem: NavItemWithPosition): void {
    const position = newItem.position || 'end';
    const itemToInsert: NavItem = {
      label: newItem.label,
      to: newItem.to,
      id: newItem.id,
      requiredPermission: newItem.requiredPermission,
      children: newItem.children,
    };

    if (position === 'start') {
      items.unshift(itemToInsert);
      return;
    }

    if (position === 'end') {
      items.push(itemToInsert);
      return;
    }

    // 'before:targetId' or 'after:targetId'
    const [direction, targetId] = position.split(':');
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (targetIndex === -1) {
      // Target not found — append at end
      items.push(itemToInsert);
      return;
    }

    if (direction === 'before') {
      items.splice(targetIndex, 0, itemToInsert);
    } else if (direction === 'after') {
      items.splice(targetIndex + 1, 0, itemToInsert);
    } else {
      items.push(itemToInsert);
    }
  }
}

export const extensionRegistry = new ExtensionRegistry();
