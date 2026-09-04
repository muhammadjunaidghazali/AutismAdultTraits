/**
 * Scoring_V2.js
 * Clinical Psychometric Assessment Scoring & Synthesis Engine
 */

(function (global) {
  "use strict";

  class AutismAssessmentEngine {
    constructor() {
      this.subscaleDefinitions = {
        AQ: [
          "socialSkill",
          "attentionSwitching",
          "attentionToDetail",
          "communication",
          "imagination"
        ],
        RAADS: [
          "socialRelatedness",
          "circumscribedInterests",
          "language",
          "sensoryMotor"
        ],
        CATQ: [
          "compensation",
          "masking",
          "assimilation"
        ],
        CATI: [
          "socialInteractions",
          "communication",
          "socialCamouflage",
          "selfRegulatory",
          "cognitiveInflexibility",
          "sensorySensitivity"
        ]
      };

      this.instrumentMetadata = {
        AQ: { title: "Autism Spectrum Quotient (AQ-50)", shortTitle: "AQ-50", cutoff: 26, max: 50 },
        RAADS: { title: "Ritvo Autism Asperger Diagnostic Scale (RAADS-R)", shortTitle: "RAADS-R", cutoff: 65, max: 240 },
        CATQ: { title: "Camouflaging Autistic Traits Questionnaire (CAT-Q)", shortTitle: "CAT-Q", cutoff: 100, max: 175 },
        CATI: { title: "Comprehensive Autistic Trait Inventory (CATI)", shortTitle: "CATI", cutoff: null, max: 210 }
      };
    }

    normalizeTestId(testId) {
      if (!testId) return "";
      const clean = String(testId).toUpperCase().replace(/[^A-Z]/g, "");
      const aliases = { AQ: "AQ", RAADS: "RAADS", RAADSR: "RAADS", CATQ: "CATQ", CATI: "CATI" };
      return aliases[clean] || clean;
    }

    normalizeSubscale(name) {
      if (!name) return "";
      const clean = String(name).toLowerCase().replace(/[^a-z]/g, "");
      const aliasMap = {
        socialskill: "socialSkill",
        attentionswitching: "attentionSwitching",
        attentiontodetail: "attentionToDetail",
        communication: "communication",
        imagination: "imagination",
        socialrelatedness: "socialRelatedness",
        circumscribedinterests: "circumscribedInterests",
        language: "language",
        sensorymotor: "sensoryMotor",
        compensation: "compensation",
        masking: "masking",
        assimilation: "assimilation",
        socialinteractions: "socialInteractions",
        socialcamouflage: "socialCamouflage",
        selfregulatory: "selfRegulatory",
        selfregulatorybehaviours: "selfRegulatory",
        selfregulatorybehaviors: "selfRegulatory",
        cognitiveinflexibility: "cognitiveInflexibility",
        cognitiveflexibility: "cognitiveInflexibility",
        sensorysensitivity: "sensorySensitivity"
      };
      return aliasMap[clean] || clean;
    }

    getBatteryEntries(testBattery) {
      if (!testBattery) return [];
      if (Array.isArray(testBattery)) {
        return testBattery.filter(Boolean).map(test => [test.testId || test.id, test]);
      }
      return Object.entries(testBattery).filter(([key]) => key !== "_meta");
    }

    getAnswerIndex(value) {
      if (value === undefined || value === null) return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    }

    getQuestionPointValue(question, chosenIndex, testData) {
      if (!question || !question.weights) return 0;
      const weights = question.weights;

      if (Object.prototype.hasOwnProperty.call(weights, chosenIndex)) {
        return Number(weights[chosenIndex]) || 0;
      }

      const options = testData?.responseOptions || testData?._meta?.responseOptions;
      if (Array.isArray(options) && options[chosenIndex]) {
        const key = options[chosenIndex].key || options[chosenIndex];
        if (Object.prototype.hasOwnProperty.call(weights, key)) {
          return Number(weights[key]) || 0;
        }
      }

      const values = Object.values(weights);
      if (chosenIndex >= 0 && chosenIndex < values.length) {
        return Number(values[chosenIndex]) || 0;
      }
      return 0;
    }

    calculateScores(userAnswers, testBattery) {
      userAnswers = userAnswers && typeof userAnswers === "object" ? userAnswers : {};
      const rawResults = {};
      const maxResults = {};

      Object.keys(this.subscaleDefinitions).forEach(testId => {
        rawResults[testId] = { total: 0, answered: 0, missing: 0, maximum: 0, subscales: {} };
        maxResults[testId] = { subscales: {} };
        this.subscaleDefinitions[testId].forEach(sub => {
          rawResults[testId].subscales[sub] = 0;
          maxResults[testId].subscales[sub] = 0;
        });
      });

      this.getBatteryEntries(testBattery).forEach(([testId, testData]) => {
        const normId = this.normalizeTestId(testId);
        if (!rawResults[normId]) return;

        const questions = Array.isArray(testData.questions) ? testData.questions : [];

        questions.forEach(q => {
          const key = `${testId}_${q.id}`;
          const chosen = this.getAnswerIndex(userAnswers[key]);
          const vals = Object.values(q.weights || {}).map(Number).filter(Number.isFinite);
          const qMax = vals.length ? Math.max.apply(null, vals) : 0;

          rawResults[normId].maximum += qMax;
          const targetSub = this.normalizeSubscale(q.subscale);
          if (targetSub && maxResults[normId].subscales[targetSub] !== undefined) {
            maxResults[normId].subscales[targetSub] += qMax;
          }

          if (chosen === null || chosen < 0) {
            rawResults[normId].missing += 1;
            return;
          }

          const pts = this.getQuestionPointValue(q, chosen, testData);
          rawResults[normId].answered += 1;
          rawResults[normId].total += pts;

          if (targetSub && rawResults[normId].subscales[targetSub] !== undefined) {
            rawResults[normId].subscales[targetSub] += pts;
          }
        });
      });

      const normalizedMetrics = {};
      Object.keys(rawResults).forEach(testId => {
        normalizedMetrics[testId] = {
          totalPercent: this.toPercentage(rawResults[testId].total, rawResults[testId].maximum),
          subscales: {}
        };
        Object.keys(rawResults[testId].subscales).forEach(sub => {
          const raw = rawResults[testId].subscales[sub];
          const max = maxResults[testId].subscales[sub];
          normalizedMetrics[testId].subscales[sub] = this.toPercentage(raw, max);
        });
      });

      const clinicalPriorities = this.generateClinicalPriorities(rawResults, normalizedMetrics);

      return {
        rawResults,
        normalizedMetrics,
        clinicalPriorities,
        metadata: this.instrumentMetadata,
        generatedAt: new Date().toISOString()
      };
    }

    toPercentage(score, maximum) {
      score = Number(score) || 0;
      maximum = Number(maximum) || 0;
      if (maximum <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((score / maximum) * 100)));
    }

    /*
     * Synthesizes cross-battery dimensions into prioritized clinical targets
     */
    generateClinicalPriorities(raw, metrics) {
      const targets = [];

      // 1. Camouflaging & Autistic Burnout Risk
      const catqMasking = metrics.CATQ?.subscales?.masking || 0;
      const catqCompensation = metrics.CATQ?.subscales?.compensation || 0;
      const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;
      const camoAvg = Math.round((catqMasking + catqCompensation + catiCamouflage) / 3);

      let camoPriority = "Low Concern";
      if (camoAvg >= 65 || (raw.CATQ?.total || 0) >= 115) {
        camoPriority = "High Priority";
      } else if (camoAvg >= 48 || (raw.CATQ?.total || 0) >= 95) {
        camoPriority = "Moderate Focus";
      }

      targets.push({
        id: "camo_burnout",
        domain: "Camouflaging Strain & Burnout Vulnerability",
        priority: camoPriority,
        averagePercent: camoAvg,
        metrics: [
          { name: "CAT-Q Masking", val: catqMasking },
          { name: "CAT-Q Compensation", val: catqCompensation },
          { name: "CATI Social Camouflage", val: catiCamouflage }
        ],
        clinicalSignificance: "High compensatory camouflaging frequently masks deep emotional exhaustion, delays diagnosis, and correlates with clinical depression or sudden autistic burnout.",
        sessionPrompts: [
          "Explore how exhausted the client feels after social or work interactions.",
          "Identify specific environments where the client feels safe dropping the mask.",
          "Assess whether somatic symptoms (migraines, lethargy, shutdown) follow intensive social demands."
        ]
      });

      // 2. Sensory Overload & Environmental Stress
      const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
      const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;
      const sensoryAvg = Math.round((raadsSensory + catiSensory) / 2);

      let sensoryPriority = "Low Concern";
      if (sensoryAvg >= 60) {
        sensoryPriority = "High Priority";
      } else if (sensoryAvg >= 45) {
        sensoryPriority = "Moderate Focus";
      }

      targets.push({
        id: "sensory_distress",
        domain: "Sensory Processing & Stimulus Sensitivity",
        priority: sensoryPriority,
        averagePercent: sensoryAvg,
        metrics: [
          { name: "RAADS-R Sensory-Motor", val: raadsSensory },
          { name: "CATI Sensory Sensitivity", val: catiSensory }
        ],
        clinicalSignificance: "Sensory hyper-reactivity to sound, light, or tactile input can keep the nervous system in persistent fight-or-flight, driving chronic dysregulation.",
        sessionPrompts: [
          "Audit physical home and work environments for high-strain triggers (fluorescent lighting, open-plan noise).",
          "Evaluate current sensory regulation habits and pacing strategies.",
          "Discuss practical sensory accommodations (noise-dampening loops, dim lighting, texture-safe clothing)."
        ]
      });

      // 3. Cognitive Inflexibility & Routine Demands
      const aqSwitching = metrics.AQ?.subscales?.attentionSwitching || 0;
      const raadsInterests = metrics.RAADS?.subscales?.circumscribedInterests || 0;
      const catiInflexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;
      const routineAvg = Math.round((aqSwitching + raadsInterests + catiInflexibility) / 3);

      let routinePriority = "Low Concern";
      if (routineAvg >= 65) {
        routinePriority = "High Priority";
      } else if (routineAvg >= 50) {
        routinePriority = "Moderate Focus";
      }

      targets.push({
        id: "cognitive_inflexibility",
        domain: "Routine Dependency & Transition Distress",
        priority: routinePriority,
        averagePercent: routineAvg,
        metrics: [
          { name: "AQ Attention Switching", val: aqSwitching },
          { name: "RAADS-R Special Interests", val: raadsInterests },
          { name: "CATI Cognitive Inflexibility", val: catiInflexibility }
        ],
        clinicalSignificance: "Elevations indicate that routine disruptions trigger significant anxiety, and deep hyper-focus states may lead to difficulty disengaging or pivoting tasks.",
        sessionPrompts: [
          "Explore emotional reactions when plans change unexpectedly without advance warning.",
          "Develop low-friction transition rituals between high-intensity work and rest.",
          "Examine if special interests are currently providing restorative regulation or causing life friction."
        ]
      });

      // 4. Social Communication & Reciprocity
      const aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
      const aqComm = metrics.AQ?.subscales?.communication || 0;
      const raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
      const catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;
      const socialAvg = Math.round((aqSocial + aqComm + raadsSocial + catiSocial) / 4);

      let socialPriority = "Low Concern";
      if (socialAvg >= 65) {
        socialPriority = "High Priority";
      } else if (socialAvg >= 45) {
        socialPriority = "Moderate Focus";
      }

      targets.push({
        id: "social_communication",
        domain: "Social Reciprocity & Conversational Processing",
        priority: socialPriority,
        averagePercent: socialAvg,
        metrics: [
          { name: "AQ Social Skill", val: aqSocial },
          { name: "AQ Communication", val: aqComm },
          { name: "RAADS-R Social Relatedness", val: raadsSocial },
          { name: "CATI Social Interactions", val: catiSocial }
        ],
        clinicalSignificance: "Indicates literal interpretation of language, fatigue from unspoken neurotypical norms, and preference for direct, unambiguous communication styles.",
        sessionPrompts: [
          "Explore misunderstandings stemming from implied or subtext-heavy interactions.",
          "Affirm the client's direct communication style as a valid neurodivergent variation.",
          "Identify boundary-setting strategies for social events without self-blame."
        ]
      });

      // Sort so High Priority items surface first
      const weight = { "High Priority": 3, "Moderate Focus": 2, "Low Concern": 1 };
      targets.sort((a, b) => weight[b.priority] - weight[a.priority]);

      return targets;
    }
  }

  global.AutismAssessmentEngine = AutismAssessmentEngine;
  if (!global.assessmentEngine) {
    global.assessmentEngine = new AutismAssessmentEngine();
  }
})(typeof window !== "undefined" ? window : globalThis);
