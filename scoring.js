/**
 * Standalone Clinical Psychometric & Thematic Evaluation Engine
 */

class AutismAssessmentEngine {
    constructor() {
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
    }

    normalizeSubscale(name) {
        if (!name) return "";
        const clean = name.toLowerCase().replace(/[^a-z]/g, "");
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

    calculateScores(userAnswers, testBattery) {
        const resultsMap = {
            AQ: { total: 0, subscales: { socialSkill: 0, attentionSwitching: 0, attentionToDetail: 0, communication: 0, imagination: 0 } },
            RAADS: { total: 0, subscales: { socialRelatedness: 0, circumscribedInterests: 0, language: 0, sensoryMotor: 0 } },
            CATQ: { total: 0, subscales: { compensation: 0, masking: 0, assimilation: 0 } },
            CATI: { total: 0, subscales: { socialInteractions: 0, communication: 0, socialCamouflage: 0, selfRegulatory: 0, cognitiveInflexibility: 0, sensorySensitivity: 0 } }
        };

        const batteryEntries = Array.isArray(testBattery)
            ? testBattery.map(t => [t.id, t])
            : Object.entries(testBattery);

        batteryEntries.forEach(([testId, testData]) => {
            const normalizedTestId = testId.replace(/[^a-zA-Z]/g, "");
            if (!resultsMap[normalizedTestId]) return;

            const questions = testData.questions || [];
            questions.forEach(q => {
                const answerKey = `${testId}_${q.id}`;
                const chosenIndex = userAnswers[answerKey];

                if (chosenIndex !== undefined && q.weights) {
                    const weightValues = Object.values(q.weights);
                    const pointValue = Number(weightValues[chosenIndex]) || 0;

                    resultsMap[normalizedTestId].total += pointValue;

                    const targetSubscale = this.normalizeSubscale(q.subscale);
                    if (targetSubscale && resultsMap[normalizedTestId].subscales[targetSubscale] !== undefined) {
                        resultsMap[normalizedTestId].subscales[targetSubscale] += pointValue;
                    }
                }
            });
        });

        const normalizedMetrics = {};
        Object.keys(resultsMap).forEach(testId => {
            normalizedMetrics[testId] = { subscales: {} };
            Object.keys(resultsMap[testId].subscales).forEach(subKey => {
                const rawScore = resultsMap[testId].subscales[subKey];
                const maxPossible = this.subscaleMaxScores[testId]?.[subKey] || 1;
                normalizedMetrics[testId].subscales[subKey] = Math.min(100, Math.round((rawScore / maxPossible) * 100));
            });
        });

        const prominentThemes = this.evaluateCrossTestThemes(normalizedMetrics);

        return {
            rawResults: resultsMap,
            normalizedMetrics: normalizedMetrics,
            thematicAnalysis: prominentThemes
        };
    }

    evaluateCrossTestThemes(metrics) {
        const discoveredThemes = [];

        const aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
        const raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
        const catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;

        if (aqSocial >= 70 || raadsSocial >= 50 || catiSocial >= 70) {
            let prominence = "Low";
            if (aqSocial >= 80 && raadsSocial >= 65 && catiSocial >= 80) prominence = "High";
            else if (aqSocial >= 60 || raadsSocial >= 45 || catiSocial >= 60) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Social Dynamics & Interaction Divergence",
                prominence: prominence,
                description: "Highlights a preference for intentional, direct communication and potential cognitive exhaustion from unstructured group social gatherings."
            });
        }

        const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
        const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;

        if (raadsSensory >= 50 || catiSensory >= 50) {
            let prominence = "Low";
            if (raadsSensory >= 70 && catiSensory >= 70) prominence = "High";
            else if (raadsSensory >= 50 || catiSensory >= 50) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Sensory Processing Profile",
                prominence: prominence,
                description: "Heightened neurological responsiveness to environmental stimulation such as bright lighting, background noise, or tactile friction."
            });
        }

        const catqMasking = ((metrics.CATQ?.subscales?.masking || 0) + (metrics.CATQ?.subscales?.compensation || 0)) / 2;
        const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;

        if (catqMasking >= 60 || catiCamouflage >= 60) {
            let prominence = "Low";
            if (catqMasking >= 75 && catiCamouflage >= 75) prominence = "High";
            else if (catqMasking >= 55 || catiCamouflage >= 55) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Social Camouflaging & Cognitive Adaptation",
                prominence: prominence,
                description: "Active deployment of conscious social coping strategies and internal behavioral scripts, requiring sustained mental effort."
            });
        }

        const aqDetail = metrics.AQ?.subscales?.attentionToDetail || 0;
        const raadsRoutine = metrics.RAADS?.subscales?.circumscribedInterests || 0;
        const catiFlexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;

        if (aqDetail >= 70 || raadsRoutine >= 60 || catiFlexibility >= 70) {
            let prominence = "Low";
            if (aqDetail >= 80 && raadsRoutine >= 70 && catiFlexibility >= 80) prominence = "High";
            else if (aqDetail >= 60 || raadsRoutine >= 50 || catiFlexibility >= 60) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Cognitive Systemizing & Focus Variations",
                prominence: prominence,
                description: "High affinity for rule-based precision, deep-dive interests, and predictable routines, paired with friction around sudden disruptions."
            });
        }

        if (discoveredThemes.length === 0) {
            discoveredThemes.push({
                themeName: "Sub-Threshold Trait Configuration",
                prominence: "Low",
                description: "Responses across this battery align broadly with standard non-autistic baselines, with no prominent thematic peaks identified."
            });
        }

        return discoveredThemes;
    }
}

window.AutismAssessmentEngine = AutismAssessmentEngine;