<template>
  <div class="settings-view">
    <div class="settings-header">
      <h2>{{ $t('settings.title') }}</h2>
    </div>

    <!-- Main Tabs -->
    <div
      class="tabs-container"
      data-testid="settings-tabs"
    >
      <button
        data-testid="tab-core-settings"
        class="tab-btn"
        :class="{ active: activeTab === 'core' }"
        @click="activeTab = 'core'"
      >
        {{ $t('settings.tabs.coreSettings') }}
      </button>
      <button
        data-testid="tab-tokens"
        class="tab-btn"
        :class="{ active: activeTab === 'tokens' }"
        @click="activeTab = 'tokens'"
      >
        {{ $t('settings.tabs.tokens') }}
      </button>
      <button
        data-testid="tab-admin-plugins"
        class="tab-btn"
        :class="{ active: activeTab === 'adminPlugins' }"
        @click="activeTab = 'adminPlugins'"
      >
        {{ $t('settings.tabs.adminPlugins') }}
      </button>
      <button
        data-testid="tab-backend-plugins"
        class="tab-btn"
        :class="{ active: activeTab === 'backendPlugins' }"
        @click="activeTab = 'backendPlugins'"
      >
        {{ $t('settings.tabs.backendPlugins') }}
      </button>
      <button
        data-testid="tab-user-plugins"
        class="tab-btn"
        :class="{ active: activeTab === 'userPlugins' }"
        @click="activeTab = 'userPlugins'"
      >
        {{ $t('settings.tabs.userPlugins') }}
      </button>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      data-testid="loading-spinner"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="fetchError"
      data-testid="fetch-error"
      class="error-state"
    >
      <p>{{ fetchError }}</p>
      <button
        class="retry-btn"
        @click="fetchSettings"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Tab Content -->
    <div
      v-else
      class="tab-content"
    >
      <!-- Success/Error Messages -->
      <div
        v-if="successMessage"
        data-testid="success-message"
        class="success-message"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="saveError"
        data-testid="error-message"
        class="error-message"
      >
        {{ saveError }}
      </div>

      <!-- Core Settings Tab -->
      <div
        v-show="activeTab === 'core'"
        data-testid="core-settings-content"
        class="settings-form"
      >
        <!-- Service Provider Information -->
        <div class="form-section">
          <h3>{{ $t('settings.coreSettings.title') }}</h3>

          <div class="form-group">
            <label for="provider-name">{{ $t('settings.coreSettings.providerName') }}</label>
            <input
              id="provider-name"
              v-model="coreSettingsData.provider_name"
              data-testid="provider-name-input"
              type="text"
              class="form-input"
              :placeholder="$t('settings.coreSettings.providerNamePlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="contact-email">{{ $t('settings.coreSettings.contactEmail') }}</label>
            <input
              id="contact-email"
              v-model="coreSettingsData.contact_email"
              data-testid="contact-email-input"
              type="email"
              class="form-input"
              :placeholder="$t('settings.coreSettings.contactEmailPlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="website-url">{{ $t('settings.coreSettings.websiteUrl') }}</label>
            <input
              id="website-url"
              v-model="coreSettingsData.website_url"
              data-testid="website-url-input"
              type="url"
              class="form-input"
              :placeholder="$t('settings.coreSettings.websiteUrlPlaceholder')"
            >
          </div>

          <div class="form-group">
            <label for="other-links">{{ $t('settings.coreSettings.otherLinks') }}</label>
            <textarea
              id="other-links"
              v-model="coreSettingsData.other_links"
              data-testid="other-links-input"
              class="form-textarea"
              rows="3"
              :placeholder="$t('settings.coreSettings.otherLinksPlaceholder')"
            />
          </div>
        </div>

        <!-- Address -->
        <div class="form-section">
          <h3>{{ $t('settings.coreSettings.address') }}</h3>

          <div class="form-group">
            <label for="street">{{ $t('settings.coreSettings.street') }}</label>
            <input
              id="street"
              v-model="coreSettingsData.address_street"
              data-testid="street-input"
              type="text"
              class="form-input"
              :placeholder="$t('settings.coreSettings.streetPlaceholder')"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="city">{{ $t('settings.coreSettings.city') }}</label>
              <input
                id="city"
                v-model="coreSettingsData.address_city"
                data-testid="city-input"
                type="text"
                class="form-input"
                :placeholder="$t('settings.coreSettings.cityPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label for="postal-code">{{ $t('settings.coreSettings.postalCode') }}</label>
              <input
                id="postal-code"
                v-model="coreSettingsData.address_postal_code"
                data-testid="postal-code-input"
                type="text"
                class="form-input"
                :placeholder="$t('settings.coreSettings.postalCodePlaceholder')"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="country">{{ $t('settings.coreSettings.country') }}</label>
            <input
              id="country"
              v-model="coreSettingsData.address_country"
              data-testid="country-input"
              type="text"
              class="form-input"
              :placeholder="$t('settings.coreSettings.countryPlaceholder')"
            >
          </div>
        </div>

        <!-- Bank Account -->
        <div class="form-section">
          <h3>{{ $t('settings.coreSettings.bankAccount') }}</h3>

          <div class="form-group">
            <label for="bank-name">{{ $t('settings.coreSettings.bankName') }}</label>
            <input
              id="bank-name"
              v-model="coreSettingsData.bank_name"
              data-testid="bank-name-input"
              type="text"
              class="form-input"
              :placeholder="$t('settings.coreSettings.bankNamePlaceholder')"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="iban">{{ $t('settings.coreSettings.iban') }}</label>
              <input
                id="iban"
                v-model="coreSettingsData.bank_iban"
                data-testid="iban-input"
                type="text"
                class="form-input"
                :placeholder="$t('settings.coreSettings.ibanPlaceholder')"
              >
            </div>
            <div class="form-group">
              <label for="bic">{{ $t('settings.coreSettings.bic') }}</label>
              <input
                id="bic"
                v-model="coreSettingsData.bank_bic"
                data-testid="bic-input"
                type="text"
                class="form-input"
                :placeholder="$t('settings.coreSettings.bicPlaceholder')"
              >
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            v-if="canManage"
            type="button"
            data-testid="save-core-settings-button"
            class="save-btn"
            :disabled="saving"
            @click="handleSaveCoreSettings"
          >
            {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
          </button>
        </div>
      </div>

      <!-- Tokens Tab -->
      <div
        v-show="activeTab === 'tokens'"
        data-testid="tokens-content"
        class="tokens-tab"
      >
        <div class="form-section token-bundles-section">
          <div class="section-header">
            <div>
              <h3>{{ $t('settings.tokens.title') }}</h3>
              <p class="section-description">
                {{ $t('settings.tokens.description') }}
              </p>
            </div>
            <div class="section-actions">
              <ImportExportControls
                v-if="showBundlesImportExport"
                data-testid="token-bundles-import-export"
                :api="dataExchangeApi"
                entity-key="token_bundles"
                :can-export="bundlesCapabilities.can_export"
                :can-import="bundlesCapabilities.can_import"
                :can-export-pii="bundlesCapabilities.can_export_pii"
                :is-superadmin="isSuperAdmin"
                :supported-formats="bundlesCapabilities.supported_formats"
                @refresh="loadTokenBundles(bundlesPagination.page)"
              />
              <router-link
                v-if="canManage"
                to="/admin/settings/token-bundles/new"
                class="create-btn"
                data-testid="create-bundle-btn"
              >
                {{ $t('tokenBundles.createBundle') }}
              </router-link>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="bundlesLoading"
            class="bundles-loading"
            data-testid="bundles-loading"
          >
            <div class="spinner" />
            <p>{{ $t('common.loading') }}</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="bundlesError"
            class="bundles-error"
            data-testid="bundles-error"
          >
            <p>{{ bundlesError }}</p>
            <button
              class="retry-btn"
              @click="loadTokenBundles()"
            >
              {{ $t('common.retry') }}
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="tokenBundles.length === 0"
            class="empty-state"
            data-testid="no-bundles"
          >
            <p>{{ $t('tokenBundles.noBundles') }}</p>
            <p class="empty-hint">
              {{ $t('tokenBundles.createFirst') }}
            </p>
          </div>

          <!-- Token Bundles Table -->
          <div
            v-else
            class="bundles-table-container"
          >
            <!-- Bulk toolbar -->
            <div
              v-if="selectedBundleIds.size > 0"
              class="bulk-toolbar"
              data-testid="bundles-bulk-toolbar"
            >
              <span
                class="bulk-count"
                data-testid="bundles-bulk-selected-count"
              >
                {{ $t('tokenBundles.bulkDelete.selectedCount', { count: selectedBundleIds.size }) }}
              </span>
              <button
                v-if="canManage"
                class="action-btn delete-btn"
                data-testid="bundles-bulk-delete-btn"
                @click="handleBulkDeleteBundles"
              >
                {{ $t('tokenBundles.bulkDelete.deleteSelected') }}
              </button>
            </div>

            <table
              class="bundles-table"
              data-testid="token-bundles-table"
            >
              <thead>
                <tr>
                  <th
                    v-if="canManage"
                    class="checkbox-col"
                  >
                    <input
                      type="checkbox"
                      :checked="allBundlesSelected"
                      data-testid="select-all-bundles"
                      @change="toggleAllBundles"
                    >
                  </th>
                  <th>{{ $t('tokenBundles.name') }}</th>
                  <th>{{ $t('tokenBundles.tokens') }}</th>
                  <th>{{ $t('tokenBundles.price') }}</th>
                  <th>{{ $t('common.status') }}</th>
                  <th>{{ $t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="bundle in tokenBundles"
                  :key="bundle.id"
                  data-testid="bundle-row"
                >
                  <td
                    v-if="canManage"
                    class="checkbox-col"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedBundleIds.has(bundle.id)"
                      :data-testid="`select-bundle-${bundle.id}`"
                      @change="toggleSelectBundle(bundle.id)"
                    >
                  </td>
                  <td class="bundle-name">
                    <router-link :to="`/admin/settings/token-bundles/${bundle.id}`">
                      {{ bundle.name }}
                    </router-link>
                    <span
                      v-if="bundle.description"
                      class="bundle-description"
                    >
                      {{ bundle.description }}
                    </span>
                  </td>
                  <td class="bundle-tokens">
                    {{ formatNumber(bundle.token_amount) }}
                  </td>
                  <td class="bundle-price">
                    {{ formatPrice(bundle.price) }}
                  </td>
                  <td>
                    <span
                      class="status-badge"
                      :class="{ active: bundle.is_active, inactive: !bundle.is_active }"
                    >
                      {{ bundle.is_active ? $t('common.active') : $t('common.inactive') }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <router-link
                      :to="`/admin/settings/token-bundles/${bundle.id}`"
                      class="action-btn edit-btn"
                      data-testid="edit-bundle-btn"
                    >
                      {{ $t('common.edit') }}
                    </router-link>
                    <button
                      v-if="canManage && bundle.is_active"
                      class="action-btn deactivate-btn"
                      data-testid="deactivate-bundle-btn"
                      @click="handleDeactivate(bundle.id)"
                    >
                      {{ $t('tokenBundles.deactivate') }}
                    </button>
                    <button
                      v-else-if="canManage && !bundle.is_active"
                      class="action-btn activate-btn"
                      data-testid="activate-bundle-btn"
                      @click="handleActivate(bundle.id)"
                    >
                      {{ $t('tokenBundles.activate') }}
                    </button>
                    <button
                      v-if="canManage"
                      class="action-btn delete-btn"
                      data-testid="delete-bundle-btn"
                      @click="handleDelete(bundle.id)"
                    >
                      {{ $t('common.delete') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination -->
            <div
              v-if="bundlesPagination.pages > 1"
              class="pagination"
              data-testid="bundles-pagination"
            >
              <button
                class="page-btn"
                :disabled="bundlesPagination.page <= 1"
                @click="changePage(bundlesPagination.page - 1)"
              >
                {{ $t('common.previous') }}
              </button>
              <span class="page-info">
                {{ $t('common.page') }} {{ bundlesPagination.page }} {{ $t('common.of') }} {{ bundlesPagination.pages }}
              </span>
              <button
                class="page-btn"
                :disabled="bundlesPagination.page >= bundlesPagination.pages"
                @click="changePage(bundlesPagination.page + 1)"
              >
                {{ $t('common.next') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Plugins Tab -->
      <div
        v-show="activeTab === 'adminPlugins'"
        data-testid="admin-plugins-content"
        class="plugins-tab"
      >
        <div class="form-section">
          <div class="section-header">
            <div>
              <h3>{{ $t('adminPlugins.title') }}</h3>
              <p class="section-description">
                {{ $t('adminPlugins.description') }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="pluginsLoading"
            class="bundles-loading"
            data-testid="admin-plugins-loading"
          >
            <div class="spinner" />
            <p>{{ $t('common.loading') }}</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="pluginsError"
            class="bundles-error"
            data-testid="admin-plugins-error"
          >
            <p>{{ pluginsError }}</p>
            <button
              class="retry-btn"
              @click="loadPlugins()"
            >
              {{ $t('common.retry') }}
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="sortedPlugins.length === 0 && !pluginSearchQuery"
            class="empty-state"
            data-testid="no-admin-plugins"
          >
            <p>{{ $t('adminPlugins.noPlugins') }}</p>
          </div>

          <!-- Plugins Table -->
          <div
            v-else
            class="bundles-table-container"
          >
            <!-- Quick Search -->
            <div class="plugin-search-box">
              <input
                v-model="pluginSearchQuery"
                type="text"
                :placeholder="$t('adminPlugins.search')"
                class="search-input"
                data-testid="admin-plugin-search"
              >
            </div>

            <div
              v-if="sortedPlugins.length === 0 && pluginSearchQuery"
              class="empty-state"
            >
              <p>{{ $t('common.noResults') }}</p>
            </div>

            <table
              v-else
              class="bundles-table"
              data-testid="admin-plugins-table"
            >
              <thead>
                <tr>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': pluginSortKey === 'name' }"
                    @click="handlePluginSort('name')"
                  >
                    {{ $t('adminPlugins.columns.name') }}
                    <span class="sort-icon">{{ pluginSortKey === 'name' ? (pluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': pluginSortKey === 'version' }"
                    @click="handlePluginSort('version')"
                  >
                    {{ $t('adminPlugins.columns.version') }}
                    <span class="sort-icon">{{ pluginSortKey === 'version' ? (pluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': pluginSortKey === 'status' }"
                    @click="handlePluginSort('status')"
                  >
                    {{ $t('adminPlugins.columns.status') }}
                    <span class="sort-icon">{{ pluginSortKey === 'status' ? (pluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': pluginSortKey === 'installedAt' }"
                    @click="handlePluginSort('installedAt')"
                  >
                    {{ $t('adminPlugins.columns.installed') }}
                    <span class="sort-icon">{{ pluginSortKey === 'installedAt' ? (pluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th>{{ $t('adminPlugins.columns.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="plugin in sortedPlugins"
                  :key="plugin.name"
                  data-testid="admin-plugin-row"
                >
                  <td class="bundle-name">
                    <router-link :to="`/admin/settings/plugins/${plugin.name}`">
                      {{ plugin.name }}
                    </router-link>
                    <span
                      v-if="plugin.description"
                      class="bundle-description"
                    >
                      {{ plugin.description }}
                    </span>
                  </td>
                  <td>{{ plugin.version }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="{
                        active: plugin.status === 'active',
                        inactive: plugin.status === 'inactive',
                        'status-error': plugin.status === 'error'
                      }"
                    >
                      {{ plugin.status === 'active' ? $t('adminPlugins.active') : plugin.status === 'inactive' ? $t('adminPlugins.inactive') : $t('adminPlugins.error') }}
                    </span>
                  </td>
                  <td>{{ formatDate(plugin.installedAt) }}</td>
                  <td class="actions-cell">
                    <router-link
                      :to="`/admin/settings/plugins/${plugin.name}`"
                      class="action-btn edit-btn"
                      data-testid="view-admin-plugin-btn"
                    >
                      {{ $t('adminPlugins.view') }}
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Backend Plugins Tab -->
      <div
        v-show="activeTab === 'backendPlugins'"
        data-testid="backend-plugins-content"
        class="plugins-tab"
      >
        <div class="form-section">
          <div class="section-header">
            <div>
              <h3>{{ $t('backendPlugins.title') }}</h3>
              <p class="section-description">
                {{ $t('backendPlugins.description') }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="backendPluginsLoading"
            class="bundles-loading"
            data-testid="backend-plugins-loading"
          >
            <div class="spinner" />
            <p>{{ $t('common.loading') }}</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="backendPluginsError"
            class="bundles-error"
            data-testid="backend-plugins-error"
          >
            <p>{{ backendPluginsError }}</p>
            <button
              class="retry-btn"
              @click="loadBackendPlugins()"
            >
              {{ $t('common.retry') }}
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="sortedBackendPlugins.length === 0 && !backendPluginSearchQuery"
            class="empty-state"
            data-testid="no-backend-plugins"
          >
            <p>{{ $t('backendPlugins.noPlugins') }}</p>
          </div>

          <!-- Backend Plugins Table -->
          <div
            v-else
            class="bundles-table-container"
          >
            <div class="plugin-search-box">
              <input
                v-model="backendPluginSearchQuery"
                type="text"
                :placeholder="$t('backendPlugins.search')"
                class="search-input"
                data-testid="backend-plugin-search"
              >
            </div>

            <div
              v-if="sortedBackendPlugins.length === 0 && backendPluginSearchQuery"
              class="empty-state"
            >
              <p>{{ $t('common.noResults') }}</p>
            </div>

            <table
              v-else
              class="bundles-table"
              data-testid="backend-plugins-table"
            >
              <thead>
                <tr>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': backendPluginSortKey === 'name' }"
                    @click="handleBackendPluginSort('name')"
                  >
                    {{ $t('backendPlugins.columns.name') }}
                    <span class="sort-icon">{{ backendPluginSortKey === 'name' ? (backendPluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': backendPluginSortKey === 'version' }"
                    @click="handleBackendPluginSort('version')"
                  >
                    {{ $t('backendPlugins.columns.version') }}
                    <span class="sort-icon">{{ backendPluginSortKey === 'version' ? (backendPluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': backendPluginSortKey === 'status' }"
                    @click="handleBackendPluginSort('status')"
                  >
                    {{ $t('backendPlugins.columns.status') }}
                    <span class="sort-icon">{{ backendPluginSortKey === 'status' ? (backendPluginSortDir === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                  </th>
                  <th>{{ $t('backendPlugins.columns.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="bp in sortedBackendPlugins"
                  :key="bp.name"
                  data-testid="backend-plugin-row"
                >
                  <td class="bundle-name">
                    <router-link :to="`/admin/settings/backend-plugins/${bp.name}`">
                      {{ bp.name }}
                    </router-link>
                    <span
                      v-if="bp.description"
                      class="bundle-description"
                    >
                      {{ bp.description }}
                    </span>
                  </td>
                  <td>{{ bp.version }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="{
                        active: bp.status === 'active',
                        inactive: bp.status === 'inactive',
                        'status-error': bp.status === 'error'
                      }"
                    >
                      {{ bp.status === 'active' ? $t('backendPlugins.active') : bp.status === 'inactive' ? $t('backendPlugins.inactive') : $t('backendPlugins.error') }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button
                      v-if="bp.status !== 'active'"
                      class="action-btn activate-btn"
                      data-testid="enable-backend-plugin-btn"
                      @click="handleEnableBackendPlugin(bp.name)"
                    >
                      {{ $t('backendPlugins.enable') }}
                    </button>
                    <button
                      v-else
                      class="action-btn deactivate-btn"
                      data-testid="disable-backend-plugin-btn"
                      @click="handleDisableBackendPlugin(bp.name)"
                    >
                      {{ $t('backendPlugins.disable') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- User Plugins Tab -->
      <div
        v-show="activeTab === 'userPlugins'"
        data-testid="user-plugins-content"
        class="plugins-tab"
      >
        <div class="form-section">
          <div class="section-header">
            <div>
              <h3>{{ $t('userPlugins.title') }}</h3>
              <p class="section-description">
                {{ $t('userPlugins.description') }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="userPluginsLoading"
            class="bundles-loading"
            data-testid="user-plugins-loading"
          >
            <div class="spinner" />
            <p>{{ $t('common.loading') }}</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="userPluginsError"
            class="bundles-error"
            data-testid="user-plugins-error"
          >
            <p>{{ userPluginsError }}</p>
            <button
              class="retry-btn"
              @click="loadUserPlugins()"
            >
              {{ $t('common.retry') }}
            </button>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="sortedUserPlugins.length === 0 && !userPluginSearchQuery"
            class="empty-state"
            data-testid="no-user-plugins"
          >
            <p>{{ $t('userPlugins.noPlugins') }}</p>
          </div>

          <!-- User Plugins Table -->
          <div
            v-else
            class="bundles-table-container"
          >
            <div class="plugin-search-box">
              <input
                v-model="userPluginSearchQuery"
                type="text"
                :placeholder="$t('userPlugins.search')"
                class="search-input"
                data-testid="user-plugin-search"
              >
            </div>

            <div
              v-if="sortedUserPlugins.length === 0 && userPluginSearchQuery"
              class="empty-state"
            >
              <p>{{ $t('common.noResults') }}</p>
            </div>

            <table
              v-else
              class="bundles-table"
              data-testid="user-plugins-table"
            >
              <thead>
                <tr>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': userPluginSortKey === 'name' }"
                    @click="handleUserPluginSort('name')"
                  >
                    {{ $t('userPlugins.columns.name') }}
                    <span class="sort-icon">{{ userPluginSortKey === 'name' ? (userPluginSortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8693;' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': userPluginSortKey === 'version' }"
                    @click="handleUserPluginSort('version')"
                  >
                    {{ $t('userPlugins.columns.version') }}
                    <span class="sort-icon">{{ userPluginSortKey === 'version' ? (userPluginSortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8693;' }}</span>
                  </th>
                  <th
                    class="sortable-header"
                    :class="{ 'sort-active': userPluginSortKey === 'status' }"
                    @click="handleUserPluginSort('status')"
                  >
                    {{ $t('userPlugins.columns.status') }}
                    <span class="sort-icon">{{ userPluginSortKey === 'status' ? (userPluginSortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8693;' }}</span>
                  </th>
                  <th>{{ $t('userPlugins.columns.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="up in sortedUserPlugins"
                  :key="up.name"
                  data-testid="user-plugin-row"
                >
                  <td class="bundle-name">
                    <router-link :to="`/admin/settings/user-plugins/${up.name}`">
                      {{ up.name }}
                    </router-link>
                    <span
                      v-if="up.description"
                      class="bundle-description"
                    >
                      {{ up.description }}
                    </span>
                  </td>
                  <td>{{ up.version }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="{
                        active: up.status === 'active',
                        inactive: up.status === 'inactive',
                        'status-error': up.status === 'uninstalled'
                      }"
                    >
                      {{ up.status === 'active' ? $t('userPlugins.active') : up.status === 'inactive' ? $t('userPlugins.inactive') : $t('userPlugins.uninstalled') }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button
                      v-if="up.status === 'uninstalled'"
                      class="action-btn activate-btn"
                      data-testid="install-user-plugin-btn"
                      @click="handleUserPluginInstall(up.name)"
                    >
                      {{ $t('userPlugins.install') }}
                    </button>
                    <template v-else>
                      <button
                        v-if="up.status !== 'active'"
                        class="action-btn activate-btn"
                        data-testid="enable-user-plugin-btn"
                        @click="handleUserPluginEnable(up.name)"
                      >
                        {{ $t('userPlugins.enable') }}
                      </button>
                      <button
                        v-else
                        class="action-btn deactivate-btn"
                        data-testid="disable-user-plugin-btn"
                        @click="handleUserPluginDisable(up.name)"
                      >
                        {{ $t('userPlugins.disable') }}
                      </button>
                    </template>
                    <router-link
                      :to="`/admin/settings/user-plugins/${up.name}`"
                      class="action-btn edit-btn"
                      data-testid="view-user-plugin-btn"
                    >
                      {{ $t('userPlugins.view') }}
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ImportExportControls } from 'vbwd-view-component';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useTokenBundlesStore } from '@/stores/tokenBundles';
import { usePluginsStore } from '@/stores/plugins';
import type { PluginEntry } from '@/stores/plugins';
import { useUserPluginsStore } from '@/stores/userPlugins';
import type { UserPluginEntry } from '@/stores/userPlugins';
import { createDataExchangeApi } from '@/api/dataExchangeApi';
import { useDataExchangeManifest } from '@/composables/useDataExchangeManifest';

const { t } = useI18n();
const authStore = useAuthStore();
const tokenBundlesStore = useTokenBundlesStore();
const pluginsStore = usePluginsStore();
const userPluginsStore = useUserPluginsStore();

const canManage = computed(() => authStore.hasPermission('settings.manage'));
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Import/Export: the Token Bundles section embeds the shared core
// data-exchange controls, scoped to the `token_bundles` exchanger and gated by
// the same manifest the Import/Export page consumes.
const dataExchangeApi = createDataExchangeApi();
const { load: loadManifest, capabilitiesFor } = useDataExchangeManifest();
const bundlesCapabilities = computed(() => capabilitiesFor('token_bundles'));
const showBundlesImportExport = computed(
  () => bundlesCapabilities.value.can_export || bundlesCapabilities.value.can_import,
);

// Tab state
type MainTab =
  | 'core'
  | 'tokens'
  | 'adminPlugins'
  | 'backendPlugins'
  | 'userPlugins';

const activeTab = ref<MainTab>('core');

// Loading/error states
const loading = ref(true);
const saving = ref(false);
const fetchError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Core Settings form data
interface CoreSettings {
  provider_name: string;
  contact_email: string;
  website_url: string;
  other_links: string;
  address_street: string;
  address_city: string;
  address_postal_code: string;
  address_country: string;
  bank_name: string;
  bank_iban: string;
  bank_bic: string;
}

const coreSettingsData = reactive<CoreSettings>({
  provider_name: '',
  contact_email: '',
  website_url: '',
  other_links: '',
  address_street: '',
  address_city: '',
  address_postal_code: '',
  address_country: '',
  bank_name: '',
  bank_iban: '',
  bank_bic: '',
});

async function fetchSettings(): Promise<void> {
  loading.value = true;
  fetchError.value = null;

  try {
    const response = await api.get('/admin/settings') as { settings: Record<string, unknown> };
    const settings = response.settings || {};

    // Map settings to core settings form
    coreSettingsData.provider_name = (settings.provider_name as string) || (settings.company_name as string) || '';
    coreSettingsData.contact_email = (settings.contact_email as string) || (settings.company_email as string) || '';
    coreSettingsData.website_url = (settings.website_url as string) || '';
    coreSettingsData.other_links = (settings.other_links as string) || '';
    coreSettingsData.address_street = (settings.address_street as string) || '';
    coreSettingsData.address_city = (settings.address_city as string) || '';
    coreSettingsData.address_postal_code = (settings.address_postal_code as string) || '';
    coreSettingsData.address_country = (settings.address_country as string) || '';
    coreSettingsData.bank_name = (settings.bank_name as string) || '';
    coreSettingsData.bank_iban = (settings.bank_iban as string) || '';
    coreSettingsData.bank_bic = (settings.bank_bic as string) || '';
  } catch (error) {
    fetchError.value = (error as Error).message || 'Failed to load settings';
  } finally {
    loading.value = false;
  }
}

async function handleSaveCoreSettings(): Promise<void> {
  saving.value = true;
  saveError.value = null;
  successMessage.value = null;

  try {
    await api.put('/admin/settings', {
      provider_name: coreSettingsData.provider_name,
      company_name: coreSettingsData.provider_name, // For backward compatibility
      contact_email: coreSettingsData.contact_email,
      company_email: coreSettingsData.contact_email, // For backward compatibility
      website_url: coreSettingsData.website_url,
      other_links: coreSettingsData.other_links,
      address_street: coreSettingsData.address_street,
      address_city: coreSettingsData.address_city,
      address_postal_code: coreSettingsData.address_postal_code,
      address_country: coreSettingsData.address_country,
      bank_name: coreSettingsData.bank_name,
      bank_iban: coreSettingsData.bank_iban,
      bank_bic: coreSettingsData.bank_bic,
    });
    successMessage.value = t('settings.settingsSaved');
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to save settings';
  } finally {
    saving.value = false;
  }
}

// Token Bundles
const bundlesLoading = ref(false);
const bundlesError = ref<string | null>(null);
const bundlesLoaded = ref(false);

const tokenBundles = computed(() => tokenBundlesStore.bundles || []);
const bundlesPagination = computed(() => tokenBundlesStore.pagination || { page: 1, perPage: 20, total: 0, pages: 0 });

async function loadTokenBundles(page = 1): Promise<void> {
  bundlesLoading.value = true;
  bundlesError.value = null;

  try {
    await tokenBundlesStore.fetchBundles(page, 20, true);
    bundlesLoaded.value = true;
  } catch (error) {
    bundlesError.value = (error as Error).message || t('tokenBundles.loadError');
  } finally {
    bundlesLoading.value = false;
  }
}

function changePage(page: number): void {
  loadTokenBundles(page);
}

async function handleActivate(bundleId: string): Promise<void> {
  try {
    await tokenBundlesStore.activateBundle(bundleId);
    await loadTokenBundles(bundlesPagination.value.page);
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to activate bundle';
  }
}

async function handleDeactivate(bundleId: string): Promise<void> {
  try {
    await tokenBundlesStore.deactivateBundle(bundleId);
    await loadTokenBundles(bundlesPagination.value.page);
  } catch (error) {
    saveError.value = (error as Error).message || 'Failed to deactivate bundle';
  }
}

async function handleDelete(bundleId: string): Promise<void> {
  if (!confirm(t('tokenBundles.confirmDelete'))) {
    return;
  }

  try {
    await tokenBundlesStore.deleteBundle(bundleId);
    await loadTokenBundles(bundlesPagination.value.page);
  } catch (error) {
    saveError.value = (error as Error).message || t('tokenBundles.deleteError');
  }
}

// Bulk select + bulk delete (mirrors the house pattern in
// views/tax-countries/TaxesTab.vue): a `selectedBundleIds` Set, a per-row
// checkbox + select-all, and a Delete-selected action that loops the existing
// single-delete endpoint DELETE /admin/token-bundles/<id> directly via the api
// (not the store's delete-then-reload, which would abort the batch). A bundle
// with purchases may be protected: we do not abort — delete what we can and
// surface which could not, then reload + clear selection once at the end.
const selectedBundleIds = reactive(new Set<string>());

const allBundlesSelected = computed(
  () => tokenBundles.value.length > 0 && tokenBundles.value.every(bundle => selectedBundleIds.has(bundle.id)),
);

function toggleSelectBundle(bundleId: string): void {
  if (selectedBundleIds.has(bundleId)) {
    selectedBundleIds.delete(bundleId);
  } else {
    selectedBundleIds.add(bundleId);
  }
}

function toggleAllBundles(): void {
  if (allBundlesSelected.value) {
    selectedBundleIds.clear();
  } else {
    tokenBundles.value.forEach(bundle => selectedBundleIds.add(bundle.id));
  }
}

async function handleBulkDeleteBundles(): Promise<void> {
  const bundleIds = Array.from(selectedBundleIds);
  if (bundleIds.length === 0) return;
  if (!confirm(t('tokenBundles.bulkDelete.confirm', { count: bundleIds.length }))) return;
  saveError.value = null;

  const failedNames: string[] = [];
  for (const bundleId of bundleIds) {
    try {
      await api.delete(`/admin/token-bundles/${bundleId}`);
    } catch {
      const bundle = tokenBundles.value.find(candidate => candidate.id === bundleId);
      failedNames.push(bundle ? bundle.name : bundleId);
    }
  }

  selectedBundleIds.clear();
  await loadTokenBundles(bundlesPagination.value.page);

  if (failedNames.length > 0) {
    saveError.value = t('tokenBundles.bulkDelete.someFailed', { names: failedNames.join(', ') });
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);
}

// Admin Plugins
const pluginsLoading = ref(false);
const pluginsError = ref<string | null>(null);
const pluginsLoaded = ref(false);
const pluginSearchQuery = ref('');
const pluginSortKey = ref<string>('name');
const pluginSortDir = ref<'asc' | 'desc'>('asc');

const filteredPlugins = computed((): PluginEntry[] => {
  if (!pluginSearchQuery.value) {
    return pluginsStore.plugins;
  }
  const query = pluginSearchQuery.value.toLowerCase();
  return pluginsStore.plugins.filter(
    p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))
  );
});

const sortedPlugins = computed((): PluginEntry[] => {
  const list = [...filteredPlugins.value];
  const key = pluginSortKey.value as keyof PluginEntry;
  const dir = pluginSortDir.value === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const aVal = String(a[key] || '');
    const bVal = String(b[key] || '');
    return aVal.localeCompare(bVal) * dir;
  });
});

async function loadPlugins(): Promise<void> {
  pluginsLoading.value = true;
  pluginsError.value = null;
  try {
    await pluginsStore.fetchPlugins();
    pluginsLoaded.value = true;
  } catch (e) {
    pluginsError.value = (e as Error).message || 'Failed to load plugins';
  } finally {
    pluginsLoading.value = false;
  }
}

function handlePluginSort(key: string): void {
  if (pluginSortKey.value === key) {
    pluginSortDir.value = pluginSortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    pluginSortKey.value = key;
    pluginSortDir.value = 'asc';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

// Backend Plugins
interface BackendPluginEntry {
  name: string;
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
}

const backendPluginsLoading = ref(false);
const backendPluginsError = ref<string | null>(null);
const backendPluginsLoaded = ref(false);
const backendPluginSearchQuery = ref('');
const backendPluginSortKey = ref<string>('name');
const backendPluginSortDir = ref<'asc' | 'desc'>('asc');
const backendPluginsList = ref<BackendPluginEntry[]>([]);

const filteredBackendPlugins = computed((): BackendPluginEntry[] => {
  if (!backendPluginSearchQuery.value) {
    return backendPluginsList.value;
  }
  const query = backendPluginSearchQuery.value.toLowerCase();
  return backendPluginsList.value.filter(
    p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))
  );
});

const sortedBackendPlugins = computed((): BackendPluginEntry[] => {
  const list = [...filteredBackendPlugins.value];
  const key = backendPluginSortKey.value as keyof BackendPluginEntry;
  const dir = backendPluginSortDir.value === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const aVal = String(a[key] || '');
    const bVal = String(b[key] || '');
    return aVal.localeCompare(bVal) * dir;
  });
});

async function loadBackendPlugins(): Promise<void> {
  backendPluginsLoading.value = true;
  backendPluginsError.value = null;
  try {
    const response = await api.get('/admin/plugins') as { plugins: BackendPluginEntry[] };
    backendPluginsList.value = response.plugins || [];
    backendPluginsLoaded.value = true;
  } catch (e) {
    backendPluginsError.value = (e as Error).message || 'Failed to load backend plugins';
  } finally {
    backendPluginsLoading.value = false;
  }
}

async function handleEnableBackendPlugin(name: string): Promise<void> {
  try {
    await api.post(`/admin/plugins/${name}/enable`);
    await loadBackendPlugins();
  } catch (e) {
    backendPluginsError.value = (e as Error).message || 'Failed to enable plugin';
  }
}

async function handleDisableBackendPlugin(name: string): Promise<void> {
  try {
    await api.post(`/admin/plugins/${name}/disable`);
    await loadBackendPlugins();
  } catch (e) {
    backendPluginsError.value = (e as Error).message || 'Failed to disable plugin';
  }
}

function handleBackendPluginSort(key: string): void {
  if (backendPluginSortKey.value === key) {
    backendPluginSortDir.value = backendPluginSortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    backendPluginSortKey.value = key;
    backendPluginSortDir.value = 'asc';
  }
}

// User Plugins
const userPluginsLoading = ref(false);
const userPluginsError = ref<string | null>(null);
const userPluginsLoaded = ref(false);
const userPluginSearchQuery = ref('');
const userPluginSortKey = ref<string>('name');
const userPluginSortDir = ref<'asc' | 'desc'>('asc');

const filteredUserPlugins = computed((): UserPluginEntry[] => {
  if (!userPluginSearchQuery.value) {
    return userPluginsStore.plugins;
  }
  const query = userPluginSearchQuery.value.toLowerCase();
  return userPluginsStore.plugins.filter(
    p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query))
  );
});

const sortedUserPlugins = computed((): UserPluginEntry[] => {
  const list = [...filteredUserPlugins.value];
  const key = userPluginSortKey.value as keyof UserPluginEntry;
  const dir = userPluginSortDir.value === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    const aVal = String(a[key] || '');
    const bVal = String(b[key] || '');
    return aVal.localeCompare(bVal) * dir;
  });
});

async function loadUserPlugins(): Promise<void> {
  userPluginsLoading.value = true;
  userPluginsError.value = null;
  try {
    await userPluginsStore.fetchPlugins();
    userPluginsLoaded.value = true;
  } catch (e) {
    userPluginsError.value = (e as Error).message || t('userPlugins.connectionError');
  } finally {
    userPluginsLoading.value = false;
  }
}

async function handleUserPluginEnable(name: string): Promise<void> {
  try {
    await userPluginsStore.enablePlugin(name);
  } catch (e) {
    userPluginsError.value = (e as Error).message;
  }
}

async function handleUserPluginDisable(name: string): Promise<void> {
  try {
    await userPluginsStore.disablePlugin(name);
  } catch (e) {
    userPluginsError.value = (e as Error).message;
  }
}

async function handleUserPluginInstall(name: string): Promise<void> {
  try {
    await userPluginsStore.installPlugin(name);
  } catch (e) {
    userPluginsError.value = (e as Error).message;
  }
}

function handleUserPluginSort(key: string): void {
  if (userPluginSortKey.value === key) {
    userPluginSortDir.value = userPluginSortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    userPluginSortKey.value = key;
    userPluginSortDir.value = 'asc';
  }
}

// Lazy-load tab data
watch(activeTab, (newTab) => {
  if (newTab === 'tokens' && !bundlesLoaded.value) {
    loadTokenBundles();
    loadManifest();
  }
  if (newTab === 'adminPlugins' && !pluginsLoaded.value) {
    loadPlugins();
  }
  if (newTab === 'backendPlugins' && !backendPluginsLoaded.value) {
    loadBackendPlugins();
  }
  if (newTab === 'userPlugins' && !userPluginsLoaded.value) {
    loadUserPlugins();
  }
});

onMounted(() => {
  fetchSettings();
});
</script>

<style scoped>
.settings-view {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.settings-header {
  margin-bottom: 20px;
}

.settings-header h2 {
  margin: 0;
  color: #2c3e50;
}

/* Main Tabs */
.tabs-container {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #3498db;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

/* Loading/Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Tab Content */
.tab-content {
  padding: 10px 0;
}

.settings-form {
  max-width: 700px;
}

/* Messages */
.success-message {
  background: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

/* Form Sections */
.form-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.section-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3498db;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Form Actions */
.form-actions {
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.save-btn {
  padding: 12px 30px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Empty/Placeholder States */
.empty-state,
.placeholder-content {
  text-align: center;
  padding: 40px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
}

.placeholder-content p {
  margin: 0;
}

/* Tokens Tab */
.tokens-tab .form-section {
  max-width: 100%;
}

.token-bundles-section {
  padding: 20px;
}

.token-bundles-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.token-bundles-section .section-header h3 {
  margin: 0 0 8px 0;
  border-bottom: none;
  padding-bottom: 0;
}

.token-bundles-section .section-header .section-description {
  margin-bottom: 0;
}

.token-bundles-section .section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: #eef2ff;
  border-radius: 6px;
  margin-bottom: 12px;
}

.bulk-count {
  font-size: 14px;
  font-weight: 600;
  color: #4338ca;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.create-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.create-btn:hover {
  background: #218838;
}

/* Bundles Table */
.bundles-table-container {
  overflow-x: auto;
}

.bundles-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.bundles-table th,
.bundles-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.bundles-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.bundles-table tbody tr:hover {
  background: #f8f9fa;
}

.bundle-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bundle-name a {
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}

.bundle-name a:hover {
  text-decoration: underline;
}

.bundle-description {
  font-size: 0.85rem;
  color: #666;
}

.bundle-tokens {
  font-weight: 500;
  color: #2c3e50;
}

.bundle-price {
  font-weight: 500;
  color: #28a745;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #e9ecef;
  color: #666;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.action-btn.edit-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.action-btn.edit-btn:hover {
  background: #bbdefb;
}

.action-btn.activate-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.action-btn.activate-btn:hover {
  background: #c8e6c9;
}

.action-btn.deactivate-btn {
  background: #fff3e0;
  color: #f57c00;
}

.action-btn.deactivate-btn:hover {
  background: #ffe0b2;
}

.action-btn.delete-btn {
  background: #ffebee;
  color: #d32f2f;
}

.action-btn.delete-btn:hover {
  background: #ffcdd2;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.page-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.page-btn:disabled {
  background: #f8f9fa;
  color: #aaa;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

/* Bundles Loading/Error States */
.bundles-loading,
.bundles-error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.bundles-error {
  background: #fff5f5;
  border-radius: 8px;
}

.empty-hint {
  margin-top: 10px;
  font-size: 0.9rem;
  color: #999;
}

/* Plugins Tab */
.plugins-tab .form-section {
  max-width: 100%;
}

.plugins-tab .section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.plugins-tab .section-header h3 {
  margin: 0 0 8px 0;
  border-bottom: none;
  padding-bottom: 0;
}

.plugins-tab .section-header .section-description {
  margin-bottom: 0;
}

.plugin-search-box {
  margin-bottom: 15px;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.sortable-header:hover {
  background: #e9ecef;
}

.sort-icon {
  font-size: 0.7rem;
  margin-left: 4px;
  opacity: 0.5;
}

.sort-active .sort-icon {
  opacity: 1;
}

.status-badge.status-error {
  background: #f8d7da;
  color: #721c24;
}

</style>
