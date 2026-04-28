// client/src/components/hunt/validationMapping.ts
import type { CheckId, CheckSeverity, ValidationCheck, ValidationReport } from '@/hooks/useHuntValidation';

export type HuntSection = 'target' | 'save' | 'gear';

const CHECK_TO_SECTION: Record<CheckId, HuntSection> = {
	mode_species: 'target',
	game_species: 'target',
	wild_location: 'target',
	wild_encounter: 'target',
	fishing_location: 'target',
	fishing_encounter: 'target',
	fishing_rod: 'gear',
	egg_daycare: 'save',
	stationary_location: 'save',
	stationary_party: 'save',
};

export function checksForSection(report: ValidationReport | null, section: HuntSection): ValidationCheck[] {
	if (!report) return [];
	return report.checks.filter(c => c.severity !== 'skipped' && CHECK_TO_SECTION[c.id] === section);
}

export function surfacedChecks(report: ValidationReport | null): ValidationCheck[] {
	if (!report) return [];
	return report.checks.filter(c => c.severity !== 'skipped');
}

export function hasErrors(report: ValidationReport | null): boolean {
	return surfacedChecks(report).some(c => c.severity === 'error');
}

export const SEVERITY_PILL: Record<Exclude<CheckSeverity, 'skipped'>, string> = {
	error: 'bg-red-50 border border-red-200 text-red-700',
	warning: 'bg-amber-50 border border-amber-200 text-amber-800',
};
