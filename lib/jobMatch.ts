import type { Evidence } from './scoring';

export interface JobRequirements {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  keywords: string[];
  experienceLevel: string;
}

export interface JobMatchResult {
  jobMatchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedNiceToHave: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const normalize = (s: string) => s.toLowerCase().trim();

function isFoundIn(term: string, resumeSkillsLower: string[], resumeTextLower: string): boolean {
  const t = normalize(term);
  if (!t) return false;
  return resumeSkillsLower.some((s) => s === t || s.includes(t) || t.includes(s)) || resumeTextLower.includes(t);
}

export function computeJobMatch(evidence: Evidence, resumeText: string, requirements: JobRequirements): JobMatchResult {
  const resumeSkillsLower = evidence.skills.map(normalize);
  const resumeTextLower = resumeText.toLowerCase();

  const matchedSkills = requirements.requiredSkills.filter((s) => isFoundIn(s, resumeSkillsLower, resumeTextLower));
  const missingSkills = requirements.requiredSkills.filter((s) => !matchedSkills.includes(s));

  const matchedNiceToHave = requirements.niceToHaveSkills.filter((s) =>
    isFoundIn(s, resumeSkillsLower, resumeTextLower)
  );

  const matchedKeywords = requirements.keywords.filter((k) => isFoundIn(k, resumeSkillsLower, resumeTextLower));
  const missingKeywords = requirements.keywords.filter((k) => !matchedKeywords.includes(k));

  const skillRatio = requirements.requiredSkills.length ? matchedSkills.length / requirements.requiredSkills.length : 1;
  const keywordRatio = requirements.keywords.length ? matchedKeywords.length / requirements.keywords.length : 1;
  const niceToHaveRatio = requirements.niceToHaveSkills.length
    ? matchedNiceToHave.length / requirements.niceToHaveSkills.length
    : 1;

  const jobMatchScore = clamp(skillRatio * 55 + keywordRatio * 30 + niceToHaveRatio * 15);

  const notes: string[] = [];
  if (missingSkills.length > 0) {
    notes.push(`Missing ${missingSkills.length} required skill(s): ${missingSkills.join(', ')}`);
  }
  if (missingKeywords.length > 0) {
    notes.push(`Missing ${missingKeywords.length} keyword(s) from the job description: ${missingKeywords.join(', ')}`);
  }
  if (matchedSkills.length === requirements.requiredSkills.length && requirements.requiredSkills.length > 0) {
    notes.push('All required skills are present in your resume');
  }

  return { jobMatchScore, matchedSkills, missingSkills, matchedNiceToHave, matchedKeywords, missingKeywords, notes };
}
