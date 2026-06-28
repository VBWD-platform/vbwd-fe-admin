import { describe, it, expect } from 'vitest';
import {
  normalizePluginDependency,
  normalizePluginDependencies,
  unsatisfiedDependencies,
  hasUnsatisfiedDependency,
  describeDependencyRequirement,
  describeBlockedReason,
} from '@/types/pluginDependency';

// S108.6 — fe-admin must tolerate BOTH the new object dependency shape
// ({name, specifier, installed_version, satisfied}) and the OLD plain-string
// shape during rollout. A bare string means "any version, treated satisfied".
describe('pluginDependency normalizer', () => {
  it('normalizes the new object shape', () => {
    const dep = normalizePluginDependency({
      name: 'email',
      specifier: '>=26.7',
      installed_version: '26.6',
      satisfied: false,
    });
    expect(dep).toEqual({
      name: 'email',
      specifier: '>=26.7',
      installedVersion: '26.6',
      satisfied: false,
    });
  });

  it('treats a plain string (old shape) as unconstrained + satisfied', () => {
    const dep = normalizePluginDependency('email');
    expect(dep).toEqual({
      name: 'email',
      specifier: '',
      installedVersion: null,
      satisfied: true,
    });
  });

  it('defaults satisfied to true and installedVersion to null when fields are absent', () => {
    const dep = normalizePluginDependency({ name: 'cms' });
    expect(dep.satisfied).toBe(true);
    expect(dep.installedVersion).toBeNull();
    expect(dep.specifier).toBe('');
  });

  it('does not crash on a mixed array of old strings and new objects', () => {
    const deps = normalizePluginDependencies([
      'cms',
      { name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false },
    ]);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toEqual({ name: 'cms', specifier: '', installedVersion: null, satisfied: true });
    expect(deps[1].satisfied).toBe(false);
  });

  it('returns an empty array for a missing/non-array value and drops nameless entries', () => {
    expect(normalizePluginDependencies(undefined)).toEqual([]);
    expect(normalizePluginDependencies(null)).toEqual([]);
    expect(normalizePluginDependencies([{ specifier: '>=1' }, 42, null])).toEqual([]);
  });

  it('detects unsatisfied dependencies', () => {
    const deps = normalizePluginDependencies([
      { name: 'cms', specifier: '', installed_version: '26.6', satisfied: true },
      { name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false },
    ]);
    expect(hasUnsatisfiedDependency(deps)).toBe(true);
    expect(unsatisfiedDependencies(deps).map(d => d.name)).toEqual(['email']);
  });

  it('reports no block for an all-satisfied set', () => {
    const deps = normalizePluginDependencies(['cms', 'email']);
    expect(hasUnsatisfiedDependency(deps)).toBe(false);
    expect(describeBlockedReason(deps)).toBe('');
  });

  it('describes a requirement with and without a specifier', () => {
    expect(describeDependencyRequirement({ name: 'email', specifier: '>=26.7', installedVersion: '26.6', satisfied: false })).toBe('email>=26.7');
    expect(describeDependencyRequirement({ name: 'cms', specifier: '', installedVersion: null, satisfied: true })).toBe('cms');
  });

  it('builds a human blocked reason naming the unmet constraint + installed version', () => {
    const deps = normalizePluginDependencies([
      { name: 'email', specifier: '>=26.7', installed_version: '26.6', satisfied: false },
    ]);
    expect(describeBlockedReason(deps)).toBe('email>=26.7 (have 26.6)');
  });
});
