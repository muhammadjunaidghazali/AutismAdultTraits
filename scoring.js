/**
 * Clinical Psychometric & Thematic Evaluation Engine
 * Robust version for cleaned or messy tests.json data
 */

class AutismAssessmentEngine {
  constructor() {
    this.testMaxScores = {
      AQ: 50,
      RAADS: 240,
      CATQ: 175,
      CATI: 210
    };

    this.subscaleMaxScores = {
      AQ: {
        socialSkill: 10,
        attentionSwitching: 10,
        attentionToDetail: 10,
        communication: 10,
        imagination: 10
      },
      RAADS: {
        socialRelatedness: 117,
        circumscribedInterests: 42,
        language: 21,
        sensoryMotor: 60
      },
      CATQ: {
        compensation: 63,
        masking: 56,
        assimilation: 56
      },
      CATI: {
        socialInteractions: 35,
        communication: 35,
        socialCamouflage: 35,
        selfRegulatory: 35,
        cognitiveInflexibility: 35,
        sensorySensitivity: 35
      }
    };

    this.thresholds = {
      social: {
        aq: 60,
        raads: 45,
        cati: 60
      },
      sensory: {
        raads: 50,
        cati: 50
      },
      masking: {
        catqAvg: 55,
        cati: 55,
        catqTotal: 100
      },
      cognitive: {
        aqDetail: 60,
        raadsRoutine: 50,
        catiFlex: 60
      }
    };
  }

  normalizeTestId(id) {
    return String(id || "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase();
  }

  normalizeBattery(testBattery) {
    const entries = Array.isArray(testBattery)
      ? testBattery.map(test => [test.id, test])
      : Object.entries(testBattery);

    return entries.reduce((acc, [id, data]) => {
      const cleanId = this.normalizeTestId(id);
      acc[cleanId] = data;
      return acc;
    }, {});
  }

  normalizeSubscale(name) {
    if (!name) return "";

    const clean = String(name)
      .toLowerCase()
      .replace(/[^a-z]/g, "");

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
      selfregulatorybehaviours: "selfRegulatory",
      selfregulatory: "selfRegulatory",
      cognitiveinflexibility: "cognitiveInflexibility",
      cognitiveflexibility: "cognitiveInflexibility",
      sensorysensitivity: "sensorySensitivity"
    };

    return aliasMap[clean] || clean;
  }

  getPointValue(question, answer) {
    if (answer === undefined || answer === null) return null;
    if (!question || !question.weights) return null;

    if (typeof answer === "number") {
      const values = Object.values(question.weights);
      return Number(values[answer]) || 0;
    }

    const key = String(answer).trim();

    if (Object.prototype.hasOwnProperty.call(question.weights, key)) {
      return Number(question.weights[key]) || 0;
    }

    const matchedKey = Object.keys(question.weights).find(weightKey => {
      return String(weightKey).trim().toLowerCase() === key.toLowerCase();
    });

    if (matchedKey) {
      return Number(question.weights[matchedKey]) || 0;
    }

    const asNumber = Number(key);

    if (Number.isInteger(asNumber)) {
      const values = Object.values(question.weights);

      if (values[asNumber] !== undefined) {
        return Number(values[asNumber]) || 0;
      }
    }

    return null;
  }

  calculateScores(userAnswers, testBattery) {
    const battery = this.normalizeBattery(testBattery);

    const cleanAnswers = {};

    Object.entries(userAnswers || {}).forEach(([key, value]) => {
      const cleanKey = String(key)
        .trim()
        .replace(/\s+/g, "");

      cleanAnswers[cleanKey] = value;
    });

    const resultsMap = {
      AQ: {
        total: 0,
        subscales: {
          socialSkill: 0,
          attentionSwitching: 0,
          attentionToDetail: 0,
          communication: 0,
          imagination: 0
        }
      },
      RAADS: {
        total: 0,
        subscales: {
          socialRelatedness: 0,
          circumscribedInterests: 0,
          language: 0,
          sensoryMotor: 0
        }
      },
      CATQ: {
        total: 0,
        subscales: {
          compensation: 0,
          masking: 0,
          assimilation: 0
        }
      },
      CATI: {
        total: 0,
        subscales: {
          socialInteractions: 0,
          communication: 0,
          socialCamouflage: 0,
          selfRegulatory: 0,
          cognitiveInflexibility: 0,
          sensorySensitivity: 0
        }
      }
    };

    Object.entries(battery).forEach(([testId, testData]) => {
      if (!resultsMap[testId]) return;

      const questions = testData.questions || [];

      questions.forEach(question => {
        const questionId = String(question.id || "")
          .replace(/[^0-9]/g, "");

        const answerKey = `${testId}_${questionId}`;
        const answer = cleanAnswers[answerKey];

        const pointValue = this.getPointValue(question, answer);

        if (pointValue === null) return;

        resultsMap[testId].total += pointValue;

        const subscale = this.normalizeSubscale(question.subscale);

        if (
          subscale &&
          resultsMap[testId].subscales[subscale] !== undefined
        ) {
          resultsMap[testId].subscales[subscale] += pointValue;
        }
      });
    });

    const normalizedMetrics = {};

    Object.keys(resultsMap).forEach(testId => {
      normalizedMetrics[testId] = {
        total: 0,
        subscales: {}
      };

      const totalMax = this.testMaxScores[testId] || 1;
      const safeTotalMax = totalMax <= 0 ? 1 : totalMax;

      normalizedMetrics[testId].total = Math.min(
        100,
        Math.round((resultsMap[testId].total / safeTotalMax) * 100)
      );

      Object.keys(resultsMap[testId].subscales).forEach(subscaleKey => {
        const rawScore = resultsMap[testId].subscales[subscaleKey];
        const maxPossible = this.subscaleMaxScores[testId]?.[subscaleKey] || 1;
        const safeMax = maxPossible <= 0 ? 1 : maxPossible;

        normalizedMetrics[testId].subscales[subscaleKey] = Math.min(
          100,
          Math.round((rawScore / safeMax) * 100)
        );
      });
    });

    return {
      rawResults: resultsMap,
      normalizedMetrics: normalizedMetrics,
      thematicAnalysis: this.evaluateCrossTestThemes(normalizedMetrics),
      clinicalInvestigationAreas: this.evaluateClinicalInvestigationAreas(
        resultsMap,
        normalizedMetrics
      )
    };
  }

  evaluateCrossTestThemes(metrics) {
    const themes = [];
    const t = this.thresholds;

    const aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
    const raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
    const catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;

    if (
      aqSocial >= t.social.aq ||
      raadsSocial >= t.social.raads ||
      catiSocial >= t.social.cati
    ) {
      let prominence = "Moderate";

      if (
        aqSocial >= 80 &&
        raadsSocial >= 65 &&
        catiSocial >= 80
      ) {
        prominence = "High";
      }

      themes.push({
        themeName: "Social Dynamics & Interaction Divergence",
        prominence: prominence,
        description:
          "Highlights a preference for intentional, direct communication and potential cognitive exhaustion from unstructured group social gatherings."
      });
    }

    const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
    const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;

    if (
      raadsSensory >= t.sensory.raads ||
      catiSensory >= t.sensory.cati
    ) {
      let prominence = "Moderate";

      if (raadsSensory >= 70 && catiSensory >= 70) {
        prominence = "High";
      }

      themes.push({
        themeName: "Sensory Processing Sensitivity",
        prominence: prominence,
        description:
          "Heightened neurological responsiveness to environmental stimulation such as bright lighting, background noise, or tactile friction."
      });
    }

    const catqMasking =
      ((metrics.CATQ?.subscales?.masking || 0) +
        (metrics.CATQ?.subscales?.compensation || 0)) /
      2;

    const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;

    if (
      catqMasking >= t.masking.catqAvg ||
      catiCamouflage >= t.masking.cati
    ) {
      let prominence = "Moderate";

      if (catqMasking >= 75 && catiCamouflage >= 75) {
        prominence = "High";
      }

      themes.push({
        themeName: "Social Camouflaging & Adaptation",
        prominence: prominence,
        description:
          "Active deployment of conscious social coping strategies and internal behavioral scripts, requiring sustained mental effort."
      });
    }

    const aqDetail = metrics.AQ?.subscales?.attentionToDetail || 0;
    const raadsRoutine = metrics.RAADS?.subscales?.circumscribedInterests || 0;
    const catiFlexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;

    if (
      aqDetail >= t.cognitive.aqDetail ||
      raadsRoutine >= t.cognitive.raadsRoutine ||
      catiFlexibility >= t.cognitive.catiFlex
    ) {
      let prominence = "Moderate";

      if (
        aqDetail >= 80 &&
        raadsRoutine >= 70 &&
        catiFlexibility >= 80
      ) {
        prominence = "High";
      }

      themes.push({
        themeName: "Cognitive Systemizing & Routine Consistency",
        prominence: prominence,
        description:
          "High affinity for rule-based precision, deep-dive interests, and predictable routines, paired with friction around sudden disruptions."
      });
    }

    if (themes.length === 0) {
      themes.push({
        themeName: "Sub-Threshold Trait Configuration",
        prominence: "Low",
        description:
          "Responses across this battery align broadly with standard non-autistic baselines, with no prominent thematic peaks identified."
      });
    }

    return themes;
  }

  evaluateClinicalInvestigationAreas(raw, metrics) {
    const areas = [];

    const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
    const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;

    if (raadsSensory >= 50 || catiSensory >= 50) {
      areas.push({
        title: "Sensory Load & Environmental Sensitivity",
        severity:
          raadsSensory >= 70 && catiSensory >= 70
            ? "Priority Focus"
            : "Clinical Consideration",
        notes:
          "Sensory markers cross-validate across RAADS-R and CATI. Investigate auditory, tactile, and visual overload triggers, as well as the need for sensory decompression."
      });
    }

    const catqTotal = raw.CATQ?.total || 0;
    const catqMasking = metrics.CATQ?.subscales?.masking || 0;
    const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;

    if (catqTotal >= 100 || catqMasking >= 65 || catiCamouflage >= 65) {
      areas.push({
        title: "Masking Compensation & Burnout Vulnerability",
        severity: "Priority Focus",
        notes:
          "Elevated CAT-Q or CATI camouflage indicates intensive social compensation. This degree of masking can suppress observable markers on standard screening tools. Inquire about late-day exhaustion and autistic burnout."
      });
    }

    const raadsInterests = metrics.RAADS?.subscales?.circumscribedInterests || 0;
    const catiInflexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;
    const aqSwitching = metrics.AQ?.subscales?.attentionSwitching || 0;

    if (
      raadsInterests >= 55 ||
      catiInflexibility >= 60 ||
      aqSwitching >= 70
    ) {
      areas.push({
        title: "Monotropic Attention & Resistance to Disruption",
        severity: "Clinical Consideration",
        notes:
          "Convergence across circumscribed interests and attention-switching indicates strong monotropic flow states. Sudden task-switching or schedule changes may be primary friction sources."
      });
    }

    const aqComm = metrics.AQ?.subscales?.communication || 0;
    const raadsLang = metrics.RAADS?.subscales?.language || 0;
    const catiComm = metrics.CATI?.subscales?.communication || 0;

    if (aqComm >= 60 || raadsLang >= 50 || catiComm >= 60) {
      areas.push({
        title: "Pragmatic Language & Literal Interpretation",
        severity: "Clinical Consideration",
        notes:
          "Elevated indicators in linguistic and non-verbal decoding. Explore difficulty with implied expectations, colloquialisms, turn-taking pauses, and the cognitive toll of manually decoding non-verbal cues."
      });
    }

    if (areas.length === 0) {
      areas.push({
        title: "Baseline Trait Harmony",
        severity: "Standard Tracking",
        notes:
          "No acute cross-battery convergent elevations flagged. Dimensional markers fall within normative variance across sensory, cognitive, and social domains."
      });
    }

    return areas;
  }
}

window.AutismAssessmentEngine = AutismAssessmentEngine;
