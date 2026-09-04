/**
 * Scoring_V2.js
 * Clinical Psychometric Assessment Scoring Engine
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
        AQ: { title: "Autism Spectrum Quotient", shortTitle: "AQ" },
        RAADS: { title: "Ritvo Autism Asperger Diagnostic Scale", shortTitle: "RAADS-R" },
        CATQ: { title: "Camouflaging Autistic Traits Questionnaire", shortTitle: "CAT-Q" },
        CATI: { title: "Comprehensive Autistic Trait Inventory", shortTitle: "CATI" }
      };
    }

    normalizeTestId(testId) {
      if (!testId) return "";
      const clean = String(testId).toUpperCase().replace(/[^A-Z]/g, "");
      const aliases = {
        AQ: "AQ",
        RAADS: "RAADS",
        RAADSR: "RAADS",
        CATQ: "CATQ",
        CATI: "CATI"
      };
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

    getExpectedResponseCount(testBattery) {
      let count = 0;
      this.getBatteryEntries(testBattery).forEach(([testId, testData]) => {
        const normId = this.normalizeTestId(testId);
        if (!this.subscaleDefinitions[normId]) return;
        const questions = Array.isArray(testData.questions) ? testData.questions : [];
        count += questions.length;
      });
      return count;
    }

    createEmptyResults() {
      const results = {};
      Object.keys(this.subscaleDefinitions).forEach(testId => {
        results[testId] = {
          total: 0,
          answered: 0,
          missing: 0,
          maximum: 0,
          subscales: {}
        };
        this.subscaleDefinitions[testId].forEach(subscale => {
          results[testId].subscales[subscale] = 0;
        });
      });
      return results;
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

    getQuestionMaximum(question) {
      if (!question || !question.weights) return 0;
      const values = Object.values(question.weights).map(Number).filter(Number.isFinite);
      return values.length ? Math.max.apply(null, values) : 0;
    }

    calculateScores(userAnswers, testBattery) {
      userAnswers = userAnswers && typeof userAnswers === "object" ? userAnswers : {};
      const rawResults = this.createEmptyResults();
      const maxResults = this.createEmptyResults();

      this.getBatteryEntries(testBattery).forEach(([testId, testData]) => {
        const normalizedTestId = this.normalizeTestId(testId);
        if (!rawResults[normalizedTestId]) return;

        const questions = Array.isArray(testData.questions) ? testData.questions : [];

        questions.forEach(question => {
          const answerKey = `${testId}_${question.id}`;
          const chosenIndex = this.getAnswerIndex(userAnswers[answerKey]);
          const questionMax = this.getQuestionMaximum(question);

          rawResults[normalizedTestId].maximum += questionMax;

          const targetSubscale = this.normalizeSubscale(question.subscale);
          if (targetSubscale && maxResults[normalizedTestId].subscales[targetSubscale] !== undefined) {
            maxResults[normalizedTestId].subscales[targetSubscale] += questionMax;
          }

          if (chosenIndex === null || chosenIndex < 0) {
            rawResults[normalizedTestId].missing += 1;
            return;
          }

          const pointValue = this.getQuestionPointValue(question, chosenIndex, testData);
          rawResults[normalizedTestId].answered += 1;
          rawResults[normalizedTestId].total += pointValue;

          if (targetSubscale && rawResults[normalizedTestId].subscales[targetSubscale] !== undefined) {
            rawResults[normalizedTestId].subscales[targetSubscale] += pointValue;
          }
        });
      });

      const normalizedMetrics = {};
      Object.keys(rawResults).forEach(testId => {
        normalizedMetrics[testId] = {
          totalPercent: this.toPercentage(rawResults[testId].total, rawResults[testId].maximum),
          subscales: {}
        };
        Object.keys(rawResults[testId].subscales).forEach(subscale => {
          const raw = rawResults[testId].subscales[subscale];
          const max = maxResults[testId].subscales[subscale];
          normalizedMetrics[testId].subscales[subscale] = this.toPercentage(raw, max);
        });
      });

      const completion = this.calculateCompletion(userAnswers, testBattery);
      const thematicAnalysis = this.evaluateCrossTestThemes(normalizedMetrics);
      const clinicalInvestigationAreas = this.evaluateClinicalInvestigationAreas(rawResults, normalizedMetrics);

      return {
        rawResults,
        normalizedMetrics,
        completion,
        thematicAnalysis,
        clinicalInvestigationAreas,
        generatedAt: new Date().toISOString()
      };
    }

    toPercentage(score, maximum) {
      score = Number(score) || 0;
      maximum = Number(maximum) || 0;
      if (maximum <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((score / maximum) * 100)));
    }

    calculateCompletion(userAnswers, testBattery) {
      const expected = this.getExpectedResponseCount(testBattery);
      const answered = Object.keys(userAnswers || {}).filter(key => {
        const val = userAnswers[key];
        return val !== undefined && val !== null && val !== "";
      }).length;

      return {
        expected,
        answered: Math.min(answered, expected),
        missing: Math.max(0, expected - answered),
        percentage: expected > 0 ? Math.round(Math.min(100, (answered / expected) * 100)) : 0,
        complete: expected > 0 && answered >= expected
      };
    }

    evaluateCrossTestThemes(metrics) {
      const discoveredThemes = [];
      const aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
      const raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
      const catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;

      if (aqSocial >= 60 && raadsSocial >= 60 && catiSocial >= 60) {
        discoveredThemes.push({
          id: "social_interaction_pattern",
          title: "Social Interaction Differences",
          prominence: "High",
          description: "Elevated indicators across social domains suggest interpersonal patterns that warrant clinical exploration.",
          evidence: ["AQ Social Skill", "RAADS-R Social Relatedness", "CATI Social Interactions"]
        });
      }

      const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
      const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;
      if (raadsSensory >= 60 && catiSensory >= 60) {
        discoveredThemes.push({
          id: "sensory_pattern",
          title: "Sensory Processing Profile",
          prominence: "High",
          description: "Elevations across sensory domains indicate potential environmental or stimulus sensitivities.",
          evidence: ["RAADS-R Sensory-Motor", "CATI Sensory Sensitivity"]
        });
      }

      const catqMasking = metrics.CATQ?.subscales?.masking || 0;
      const catqCompensation = metrics.CATQ?.subscales?.compensation || 0;
      const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;
      if (catqMasking >= 60 && catqCompensation >= 60 && catiCamouflage >= 60) {
        discoveredThemes.push({
          id: "camouflaging_pattern",
          title: "Camouflaging and Social Compensation",
          prominence: "High",
          description: "Significant reported effort dedicated to compensating, masking, and managing social presentation.",
          evidence: ["CAT-Q Masking", "CAT-Q Compensation", "CATI Social Camouflage"]
        });
      }

      return discoveredThemes;
    }

    evaluateClinicalInvestigationAreas(rawResults, normalizedMetrics) {
      const areas = [];
      const social = normalizedMetrics.AQ?.subscales?.socialSkill || 0;
      const raadsSocial = normalizedMetrics.RAADS?.subscales?.socialRelatedness || 0;
      if (social >= 60 || raadsSocial >= 60) {
        areas.push({
          id: "social_communication",
          title: "Social Communication and Reciprocity",
          rationale: "Elevated social interaction scores indicate areas to explore regarding interpersonal style and communicative ease."
        });
      }

      const masking = normalizedMetrics.CATQ?.subscales?.masking || 0;
      const compensation = normalizedMetrics.CATQ?.subscales?.compensation || 0;
      if (masking >= 60 || compensation >= 60) {
        areas.push({
          id: "camouflaging",
          title: "Camouflaging and Social Exhaustion",
          rationale: "Self-monitoring and compensation strategies can be associated with cognitive fatigue or delayed identification."
        });
      }

      return areas;
    }
  }

  global.AutismAssessmentEngine = AutismAssessmentEngine;
  if (!global.assessmentEngine) {
    global.assessmentEngine = new AutismAssessmentEngine();
  }
})(typeof window !== "undefined" ? window : globalThis);
