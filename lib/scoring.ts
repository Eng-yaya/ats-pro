// Deterministic ATS scoring engine.
// Takes the factual evidence extracted in Step 5 and computes scores using
// pure arithmetic — no AI call happens here. The same evidence object will
// always produce the exact same scores.

export interface Evidence {
  contactInfo: {
    fullNameFound: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    portfolioOrGithub: string | null;
  };
  sectionsFound: string[];
  summary: {
    present: boolean;
    text: string;
    wordCount: number;
    genericPhrases: string[];
  };
  experience: Array<{
    company: string;
    role: string;
    hasStartDate: boolean;
    hasEndDate: boolean;
    bullets: Array<{
      text: string;
      startsWithActionVerb: boolean;
      hasQuantifiableResult: boolean;
      isWeakPhrase: boolean;
    }>;
  }>;
  education: Array<{ institution: string; degree: string; hasDates: boolean }>;
  skills: string[];
  projects: Array<{ title: string; hasDescription: boolean; hasTechnologies: boolean; hasLink: boolean }>;
  certifications: string[];
  industryKeywordsFound: string[];
  weakPhrasesFound: string[];
  strongActionVerbsUsed: string[];
  dateFormatsUsed: string[];
  totalBullets: number;
  bulletsWithMetrics: number;
  wordCount: number;
}

export interface CategoryScore {
  key: string;
  label: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface PriorityFix {
  priority: 'high' | 'medium' | 'low';
  category: string;
  text: string;
}

export interface ScoreResult {
  atsCompatibilityScore: number;
  resumeQualityScore: number;
  categories: CategoryScore[];
  priorityFixes: PriorityFix[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function scoreContactInfo(evidence: Evidence): CategoryScore {
  const c = evidence.contactInfo;
  const fields: Array<[string, string | null]> = [
    ['Full name', c.fullNameFound],
    ['Email', c.email],
    ['Phone', c.phone],
    ['Location', c.location],
    ['LinkedIn', c.linkedin],
  ];
  const present = fields.filter(([, v]) => Boolean(v));
  const missing = fields.filter(([, v]) => !v);
  const score = clamp((present.length / fields.length) * 100);

  const strengths = present.map(([label]) => `${label} is present`);
  const weaknesses = missing.map(([label]) => `${label} is missing`);
  if (!c.portfolioOrGithub && evidence.skills.some((s) => /develop|engineer|software|code|design/i.test(s))) {
    weaknesses.push('Consider adding a portfolio or GitHub link');
  }

  return { key: 'contactInfo', label: 'Contact Information', score, strengths, weaknesses };
}

function scoreStructure(evidence: Evidence): CategoryScore {
  const hasSummary = evidence.summary.present;
  const hasExperienceOrProjects = evidence.experience.length > 0 || evidence.projects.length > 0;
  const hasEducation = evidence.education.length > 0;
  const hasSkills = evidence.skills.length > 0;

  const score = clamp(
    (hasSummary ? 20 : 0) + (hasExperienceOrProjects ? 30 : 0) + (hasEducation ? 25 : 0) + (hasSkills ? 25 : 0)
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (hasSummary) strengths.push('Professional summary section found'); else weaknesses.push('No professional summary section found');
  if (hasExperienceOrProjects) strengths.push('Experience or projects section found'); else weaknesses.push('No experience or projects section found');
  if (hasEducation) strengths.push('Education section found'); else weaknesses.push('No education section found');
  if (hasSkills) strengths.push('Skills section found'); else weaknesses.push('No skills section found');

  return { key: 'structure', label: 'Resume Structure', score, strengths, weaknesses };
}

function scoreSummary(evidence: Evidence): CategoryScore {
  const s = evidence.summary;
  if (!s.present) {
    return {
      key: 'summary',
      label: 'Professional Summary',
      score: 0,
      strengths: [],
      weaknesses: ['No professional summary found — add a 2-3 sentence overview at the top of your resume'],
    };
  }

  const lengthScore = s.wordCount >= 20 && s.wordCount <= 60 ? 30 : s.wordCount > 0 ? 15 : 0;
  const genericPenalty = Math.min(s.genericPhrases.length * 10, 30);
  const score = clamp(40 + lengthScore + (30 - genericPenalty));

  const strengths: string[] = ['Professional summary present'];
  const weaknesses: string[] = [];
  if (lengthScore < 30) weaknesses.push('Summary length is outside the ideal 20-60 word range');
  if (s.genericPhrases.length > 0) {
    weaknesses.push(`Contains generic filler phrases: ${s.genericPhrases.join(', ')}`);
  } else {
    strengths.push('No generic filler phrases detected');
  }

  return { key: 'summary', label: 'Professional Summary', score, strengths, weaknesses };
}

function scoreExperience(evidence: Evidence): CategoryScore {
  const allBullets = evidence.experience.flatMap((e) => e.bullets);

  if (allBullets.length === 0) {
    if (evidence.projects.length > 0) {
      const projectScores = evidence.projects.map(
        (p) => (p.hasDescription ? 40 : 0) + (p.hasTechnologies ? 30 : 0) + (p.hasLink ? 30 : 0)
      );
      const avg = projectScores.reduce((a, b) => a + b, 0) / projectScores.length;
      return {
        key: 'experience',
        label: 'Experience',
        score: clamp(avg),
        strengths: ['No formal work experience — evaluated using projects instead'],
        weaknesses: avg < 70 ? ['Add more detail (description, technologies, links) to your projects'] : [],
      };
    }
    return {
      key: 'experience',
      label: 'Experience',
      score: 50,
      strengths: [],
      weaknesses: ['No work experience or projects listed — consider adding academic projects, internships, or volunteer work'],
    };
  }

  const actionCount = allBullets.filter((b) => b.startsWithActionVerb).length;
  const metricCount = allBullets.filter((b) => b.hasQuantifiableResult).length;
  const weakCount = allBullets.filter((b) => b.isWeakPhrase).length;
  const actionRatio = actionCount / allBullets.length;
  const metricRatio = metricCount / allBullets.length;
  const weakRatio = weakCount / allBullets.length;

  const datesComplete = evidence.experience.filter((e) => e.hasStartDate && e.hasEndDate).length;
  const dateRatio = evidence.experience.length ? datesComplete / evidence.experience.length : 1;

  const score = clamp(actionRatio * 35 + metricRatio * 35 + dateRatio * 15 + (1 - weakRatio) * 15);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (actionRatio >= 0.7) strengths.push('Most bullets start with strong action verbs');
  else weaknesses.push(`Only ${actionCount}/${allBullets.length} bullets start with a strong action verb`);
  if (metricRatio >= 0.4) strengths.push('Good use of measurable results');
  else weaknesses.push(`Only ${metricCount}/${allBullets.length} bullets include a quantifiable result`);
  if (weakCount > 0) weaknesses.push(`${weakCount} bullet(s) use weak phrasing like "responsible for" or "worked on"`);
  if (dateRatio < 1) weaknesses.push('Some experience entries are missing start or end dates');

  return { key: 'experience', label: 'Experience', score, strengths, weaknesses };
}

function scoreEducation(evidence: Evidence): CategoryScore {
  if (evidence.education.length === 0) {
    return {
      key: 'education',
      label: 'Education',
      score: 50,
      strengths: [],
      weaknesses: ['No education section found — add this if applicable to your background'],
    };
  }

  const entryScores = evidence.education.map(
    (e) => (e.institution ? 30 : 0) + (e.degree ? 30 : 0) + (e.hasDates ? 40 : 0)
  );
  const score = clamp(entryScores.reduce((a, b) => a + b, 0) / entryScores.length);

  const missingDates = evidence.education.filter((e) => !e.hasDates).length;
  const strengths = ['Education entries found'];
  const weaknesses: string[] = [];
  if (missingDates > 0) weaknesses.push(`${missingDates} education entr${missingDates === 1 ? 'y is' : 'ies are'} missing dates`);

  return { key: 'education', label: 'Education', score, strengths, weaknesses };
}

function scoreSkills(evidence: Evidence): CategoryScore {
  const count = evidence.skills.length;
  const score = clamp(Math.min(100, count * 10));
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (count >= 8) strengths.push(`${count} skills listed`);
  else weaknesses.push(count === 0 ? 'No skills section found' : `Only ${count} skills listed — consider adding more relevant skills`);
  return { key: 'skills', label: 'Skills', score, strengths, weaknesses };
}

function scoreKeywords(evidence: Evidence): CategoryScore {
  const count = evidence.industryKeywordsFound.length;
  const score = clamp(Math.min(100, count * 8));
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (count >= 10) strengths.push('Strong presence of relevant industry keywords');
  else weaknesses.push('Resume could include more relevant industry terminology and keywords');
  return { key: 'keywords', label: 'Keywords', score, strengths, weaknesses };
}

function scoreWritingQuality(evidence: Evidence): CategoryScore {
  let score = 80;
  const weaknesses: string[] = [];
  const strengths: string[] = [];

  const weakPenalty = Math.min(evidence.weakPhrasesFound.length * 10, 40);
  score -= weakPenalty;
  if (weakPenalty > 0) weaknesses.push(`Uses ${evidence.weakPhrasesFound.length} weak/vague phrase(s)`);
  else strengths.push('No weak or vague phrasing detected');

  if (evidence.dateFormatsUsed.length > 1) {
    score -= 15;
    weaknesses.push(`Inconsistent date formatting (${evidence.dateFormatsUsed.join(', ')})`);
  } else {
    strengths.push('Consistent date formatting');
  }

  score += Math.min(evidence.strongActionVerbsUsed.length * 2, 20);

  return { key: 'writingQuality', label: 'Writing Quality', score: clamp(score), strengths, weaknesses };
}

function scoreAchievements(evidence: Evidence): CategoryScore {
  if (evidence.totalBullets === 0) {
    return {
      key: 'achievements',
      label: 'Quantifiable Achievements',
      score: 50,
      strengths: [],
      weaknesses: ['No bullet points to evaluate for measurable results'],
    };
  }
  const ratio = evidence.bulletsWithMetrics / evidence.totalBullets;
  const score = clamp(ratio * 100);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (ratio >= 0.4) strengths.push(`${evidence.bulletsWithMetrics}/${evidence.totalBullets} bullets include measurable results`);
  else weaknesses.push(`Only ${evidence.bulletsWithMetrics}/${evidence.totalBullets} bullets include a number, percentage, or measurable outcome`);
  return { key: 'achievements', label: 'Quantifiable Achievements', score, strengths, weaknesses };
}

export function computeScores(evidence: Evidence): ScoreResult {
  const contactInfo = scoreContactInfo(evidence);
  const structure = scoreStructure(evidence);
  const summary = scoreSummary(evidence);
  const experience = scoreExperience(evidence);
  const education = scoreEducation(evidence);
  const skills = scoreSkills(evidence);
  const keywords = scoreKeywords(evidence);
  const writingQuality = scoreWritingQuality(evidence);
  const achievements = scoreAchievements(evidence);

  const categories = [
    structure,
    contactInfo,
    summary,
    experience,
    education,
    skills,
    keywords,
    writingQuality,
    achievements,
  ];

  // ATS Compatibility: can a parser reliably read and structure this resume?
  const atsCompatibilityScore = clamp(structure.score * 0.5 + contactInfo.score * 0.3 + writingQuality.score * 0.2);

  // Resume Quality: how strong is the content itself to a human recruiter?
  const resumeQualityScore = clamp(
    summary.score * 0.15 +
      experience.score * 0.3 +
      education.score * 0.1 +
      skills.score * 0.15 +
      keywords.score * 0.1 +
      achievements.score * 0.1 +
      writingQuality.score * 0.1
  );

  const priorityFixes: PriorityFix[] = [];
  for (const cat of categories) {
    if (cat.weaknesses.length === 0) continue;
    const priority: 'high' | 'medium' | 'low' = cat.score < 50 ? 'high' : cat.score < 75 ? 'medium' : 'low';
    priorityFixes.push({ priority, category: cat.label, text: cat.weaknesses[0] });
  }
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  priorityFixes.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { atsCompatibilityScore, resumeQualityScore, categories, priorityFixes: priorityFixes.slice(0, 8) };
}
