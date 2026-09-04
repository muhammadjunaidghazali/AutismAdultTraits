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
      var clean = String(testId).toUpperCase().replace(/[^A-Z]/g, "");
      var aliases = {
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
      var clean = String(name).toLowerCase().replace(/[^a-z]/g, "");
      var aliasMap = {
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
        return testBattery.filter(Boolean).map(function (test) {
          return [test.testId || test.id, test];
        });
      }
      return Object.entries(testBattery).filter(function (entry) {
        return entry[0] !== "_meta";
      });
    }

    getExpectedResponseCount(testBattery) {
      var self = this;
      var count = 0;
      this.getBatteryEntries(testBattery).forEach(function (pair) {
        var testId = self.normalizeTestId(pair[0]);
        var testData = pair[1];
        if (!self.subscaleDefinitions[testId]) return;
        var questions = Array.isArray(testData.questions) ? testData.questions : [];
        count += questions.length;
      });
      return count;
    }

    createEmptyResults() {
      var results = {};
      var self = this;
      Object.keys(this.subscaleDefinitions).forEach(function (testId) {
        results[testId] = {
          total: 0,
          answered: 0,
          missing: 0,
          maximum: 0,
          subscales: {}
        };
        self.subscaleDefinitions[testId].forEach(function (subscale) {
          results[testId].subscales[subscale] = 0;
        });
      });
      return results;
    }

    getAnswerIndex(value) {
      if (value === undefined || value === null) return null;
      var parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    }

    getQuestionPointValue(question, chosenIndex, testData) {
      if (!question || !question.weights) return 0;
      var weights = question.weights;

      if (Object.prototype.hasOwnProperty.call(weights, chosenIndex)) {
        return Number(weights[chosenIndex]) || 0;
      }

      var keys = Array.isArray(testData?.responseOptions)
        ? testData.responseOptions.map(function (opt) { return opt.key; })
        : Object.keys(weights);

      var key = keys[chosenIndex];
      if (key && Object.prototype.hasOwnProperty.call(weights, key)) {
        return Number(weights[key]) || 0;
      }

      var values = Object.values(weights);
      if (chosenIndex >= 0 && chosenIndex < values.length) {
        return Number(values[chosenIndex]) || 0;
      }

      return 0;
    }

    getQuestionMaximum(question) {
      if (!question || !question.weights) return 0;
      var values = Object.values(question.weights).map(Number).filter(Number.isFinite);
      return values.length ? Math.max.apply(null, values) : 0;
    }

    calculateScores(userAnswers, testBattery) {
      userAnswers = userAnswers && typeof userAnswers === "object" ? userAnswers : {};
      var rawResults = this.createEmptyResults();
      var maxResults = this.createEmptyResults();
      var self = this;

      this.getBatteryEntries(testBattery).forEach(function (pair) {
        var testId = pair[0];
        var testData = pair[1];
        var normalizedTestId = self.normalizeTestId(testId);

        if (!rawResults[normalizedTestId]) return;

        var questions = Array.isArray(testData.questions) ? testData.questions : [];

        questions.forEach(function (question) {
          var answerKey = testId + "_" + question.id;
          var chosenIndex = self.getAnswerIndex(userAnswers[answerKey]);
          var questionMax = self.getQuestionMaximum(question);

          rawResults[normalizedTestId].maximum += questionMax;

          var targetSubscale = self.normalizeSubscale(question.subscale);
          if (targetSubscale && maxResults[normalizedTestId].subscales[targetSubscale] !== undefined) {
            maxResults[normalizedTestId].subscales[targetSubscale] += questionMax;
          }

          if (chosenIndex === null || chosenIndex < 0) {
            rawResults[normalizedTestId].missing += 1;
            return;
          }

          var pointValue = self.getQuestionPointValue(question, chosenIndex, testData);
          rawResults[normalizedTestId].answered += 1;
          rawResults[normalizedTestId].total += pointValue;

          if (targetSubscale && rawResults[normalizedTestId].subscales[targetSubscale] !== undefined) {
            rawResults[normalizedTestId].subscales[targetSubscale] += pointValue;
          }
        });
      });

      var normalizedMetrics = {};
      Object.keys(rawResults).forEach(function (testId) {
        normalizedMetrics[testId] = {
          totalPercent: self.toPercentage(rawResults[testId].total, rawResults[testId].maximum),
          subscales: {}
        };
        Object.keys(rawResults[testId].subscales).forEach(function (subscale) {
          var raw = rawResults[testId].subscales[subscale];
          var max = maxResults[testId].subscales[subscale];
          normalizedMetrics[testId].subscales[subscale] = self.toPercentage(raw, max);
        });
      });

      var completion = this.calculateCompletion(userAnswers, testBattery);
      var thematicAnalysis = this.evaluateCrossTestThemes(normalizedMetrics);
      var clinicalInvestigationAreas = this.evaluateClinicalInvestigationAreas(rawResults, normalizedMetrics);

      return {
        rawResults: rawResults,
        normalizedMetrics: normalizedMetrics,
        completion: completion,
        thematicAnalysis: thematicAnalysis,
        clinicalInvestigationAreas: clinicalInvestigationAreas,
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
      var expected = this.getExpectedResponseCount(testBattery);
      var answered = Object.keys(userAnswers || {}).filter(function (key) {
        var val = userAnswers[key];
        return val !== undefined && val !== null && val !== "";
      }).length;

      return {
        expected: expected,
        answered: Math.min(answered, expected),
        missing: Math.max(0, expected - answered),
        percentage: expected > 0 ? Math.round(Math.min(100, (answered / expected) * 100)) : 0,
        complete: expected > 0 && answered >= expected
      };
    }

    evaluateCrossTestThemes(metrics) {
      var discoveredThemes = [];
      var aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
      var raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
      var catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;

      if (aqSocial >= 60 && raadsSocial >= 60 && catiSocial >= 60) {
        discoveredThemes.push({
          id: "social_interaction_pattern",
          title: "Social Interaction Differences",
          prominence: "High",
          description: "Elevated scores across social domains indicate interpersonal patterns that warrant clinical exploration.",
          evidence: ["AQ Social Skill", "RAADS-R Social Relatedness", "CATI Social Interactions"]
        });
      } else if ((aqSocial >= 60 && raadsSocial >= 60) || (raadsSocial >= 60 && catiSocial >= 60)) {
        discoveredThemes.push({
          id: "social_interaction_pattern",
          title: "Social Interaction Differences",
          prominence: "Moderate",
          description: "Elevated scores in at least two social interaction domains.",
          evidence: ["Cross-measure social interaction domains"]
        });
      }

      var raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
      var catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;
      if (raadsSensory >= 60 && catiSensory >= 60) {
        discoveredThemes.push({
          id: "sensory_pattern",
          title: "Sensory Processing Profile",
          prominence: "High",
          description: "Converging elevations across sensory domains suggest sensory differences play a clinically meaningful role.",
          evidence: ["RAADS-R Sensory-Motor", "CATI Sensory Sensitivity"]
        });
      }

      var catqMasking = metrics.CATQ?.subscales?.masking || 0;
      var catqCompensation = metrics.CATQ?.subscales?.compensation || 0;
      var catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;
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
      var areas = [];
      var social = normalizedMetrics.AQ?.subscales?.socialSkill || 0;
      var raadsSocial = normalizedMetrics.RAADS?.subscales?.socialRelatedness || 0;
      if (social >= 60 || raadsSocial >= 60) {
        areas.push({
          id: "social_communication",
          title: "Social Communication and Reciprocity",
          rationale: "Elevated social interaction scores indicate areas to explore regarding interpersonal style and communicative ease."
        });
      }

      var masking = normalizedMetrics.CATQ?.subscales?.masking || 0;
      var compensation = normalizedMetrics.CATQ?.subscales?.compensation || 0;
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