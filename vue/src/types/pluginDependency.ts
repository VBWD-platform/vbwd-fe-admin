/**
 * Plugin dependency shape + normalizer (S108.6).
 *
 * The backend now returns each plugin dependency as an object
 * `{ name, specifier, installed_version, satisfied }` (specifier `""` = any
 * version). During the rollout an entry may still arrive in the OLD plain-string
 * shape — a bare name that means "any version". The normalizer tolerates both so
 * the admin UI never crashes mid-rollout.
 */

/** A single normalized plugin dependency, ready for the admin UI. */
export interface PluginDependency {
  /** Dependency plugin name. */
  name: string;
  /** PEP 440 specifier (e.g. ">=26.7"); empty string means any version. */
  specifier: string;
  /** Installed version of the dependency, or null when unknown/not installed. */
  installedVersion: string | null;
  /** Whether the installed version satisfies the specifier. */
  satisfied: boolean;
}

/** The raw object shape as delivered by the backend. */
interface RawPluginDependency {
  name?: unknown;
  specifier?: unknown;
  installed_version?: unknown;
  satisfied?: unknown;
}

/**
 * Normalize a single raw dependency entry.
 * - plain string (old shape) → unconstrained + treated satisfied.
 * - object → read fields defensively (satisfied defaults to true, version null).
 */
export function normalizePluginDependency(raw: unknown): PluginDependency {
  if (typeof raw === 'string') {
    return { name: raw, specifier: '', installedVersion: null, satisfied: true };
  }
  if (raw && typeof raw === 'object') {
    const record = raw as RawPluginDependency;
    return {
      name: typeof record.name === 'string' ? record.name : '',
      specifier: typeof record.specifier === 'string' ? record.specifier : '',
      installedVersion: typeof record.installed_version === 'string' ? record.installed_version : null,
      // Absent `satisfied` defaults to true so an unconstrained dep never blocks.
      satisfied: record.satisfied !== false,
    };
  }
  return { name: '', specifier: '', installedVersion: null, satisfied: true };
}

/** Normalize a raw dependency list, dropping entries that lack a usable name. */
export function normalizePluginDependencies(raw: unknown): PluginDependency[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePluginDependency).filter(dep => dep.name !== '');
}

/** The subset of dependencies whose installed version does not satisfy the spec. */
export function unsatisfiedDependencies(deps: PluginDependency[]): PluginDependency[] {
  return deps.filter(dep => !dep.satisfied);
}

/** True when at least one dependency is unsatisfied (enable should be blocked). */
export function hasUnsatisfiedDependency(deps: PluginDependency[]): boolean {
  return deps.some(dep => !dep.satisfied);
}

/** Render a dependency requirement, e.g. "email>=26.7" or just "cms". */
export function describeDependencyRequirement(dep: PluginDependency): string {
  return dep.specifier ? `${dep.name}${dep.specifier}` : dep.name;
}

/**
 * Build a short human reason explaining why enabling is blocked, e.g.
 * "email>=26.7 (have 26.6)". Empty string when nothing is blocking.
 */
export function describeBlockedReason(deps: PluginDependency[]): string {
  const blocking = unsatisfiedDependencies(deps);
  if (blocking.length === 0) return '';
  return blocking
    .map(dep => `${describeDependencyRequirement(dep)} (have ${dep.installedVersion ?? '—'})`)
    .join(', ');
}
