/* Plans are a frontend-only / demo concept for the MVP. There is no billing
   backend, no Stripe, no subscription state on a server — the current plan is
   just a value in localStorage so the upgrade UX can be demonstrated. */

import { useCallback, useEffect, useState } from 'react'

export type PlanId = 'free' | 'pro' | 'team'

export interface PlanLimits {
  documents: number
  storageBytes: number
  chunks: number
  questionsPerMonth: number
  knowledgeBases: number
}

export interface Plan {
  id: PlanId
  name: string
  priceMonthly: number
  priceYearly: number
  /** Displayed monthly-equivalent when billed yearly (e.g. 10 for Pro, 24.17 for Team). */
  yearlyMonthly?: number
  tagline: string
  blurb: string
  cta: string
  limits: PlanLimits
  features: string[]
  mostPopular?: boolean
}

const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: 'Explore RAG without any upfront cost.',
    blurb: 'For developers who want to try RAG Starter.',
    cta: 'Start Free',
    limits: {
      documents: 3,
      storageBytes: 500 * MB,
      chunks: 5_000,
      questionsPerMonth: 100,
      knowledgeBases: 1,
    },
    features: [
      'Up to 3 PDF documents',
      '500 MB total storage',
      'Up to 5,000 chunks',
      '100 questions / month',
      '1 Knowledge Base',
      'Basic RAG retrieval',
      'Gemini + Qdrant integration',
      'Source citations',
      'Community documentation',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 12,
    priceYearly: 120,
    yearlyMonthly: 10,
    tagline: 'Build, experiment, and scale your knowledge base with more capacity.',
    blurb: 'For developers who need more documents and higher usage.',
    cta: 'Upgrade to Pro',
    mostPopular: true,
    limits: {
      documents: 50,
      storageBytes: 10 * GB,
      chunks: 100_000,
      questionsPerMonth: 5_000,
      knowledgeBases: 10,
    },
    features: [
      'Up to 50 PDF documents',
      '10 GB storage',
      'Up to 100,000 chunks',
      '5,000 questions / month',
      'Up to 10 Knowledge Bases',
      'Advanced RAG configuration',
      'Priority processing',
      'Detailed usage analytics',
      'Full configuration controls',
      'Priority support',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    priceMonthly: 29,
    priceYearly: 290,
    yearlyMonthly: 24.17,
    tagline: 'For teams building knowledge-powered applications.',
    blurb: 'For teams, startups and collaborative RAG projects.',
    cta: 'Start Team',
    limits: {
      documents: 200,
      storageBytes: 50 * GB,
      chunks: 500_000,
      questionsPerMonth: 25_000,
      knowledgeBases: 50,
    },
    features: [
      'Up to 200 PDF documents',
      '50 GB storage',
      'Up to 500,000 chunks',
      '25,000 questions / month',
      'Up to 50 Knowledge Bases',
      'Advanced RAG configuration',
      'Advanced analytics',
      'Priority processing',
      'Team workspace',
      'Collaboration features',
      'Priority support',
    ],
  },
}

export const YEARLY_SAVING_PCT = 17 // Pro 120 vs 144, Team 290 vs 348  →  ~17%

const STORAGE_KEY = 'rag-starter.plan'

export function usePlan() {
  const [plan, setPlan] = useState<PlanId>('free')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'pro' || raw === 'free' || raw === 'team') setPlan(raw)
    } catch {
      /* storage unavailable — stay on free */
    }
  }, [])

  const changePlan = useCallback((next: PlanId) => {
    setPlan(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  return {
    plan,
    limits: PLANS[plan].limits,
    isPro: plan === 'pro',
    isFree: plan === 'free',
    changePlan,
  }
}
