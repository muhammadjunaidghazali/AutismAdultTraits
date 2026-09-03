/**
Standalone Clinical Psychometric & Thematic Evaluation Engine
*/
class AutismAssessmentEngine {
    constructor() {
        this.subscaleMaxScores = {
            AQ: { socialSkill: 10, attentionSwitching: 10, attentionToDetail: 10, communication: 10, imagination: 10 },
            RAADS: { socialRelatedness: 117, circumscribedInterests: 42, language: 21, sensoryMotor: 60 },
            CATQ: { compensation: 63, masking: 56, assimilation: 56 },
            CATI: { socialInteractions: 35, communication: 35, socialCamouflage: 35, selfRegulatory: 35, cognitiveInflexibility: 35, sensorySensitivity: 35 }
        };

        // Configurable Clinical Thresholds
        this.thresholds = {
            social: { aq: 60, raads: 45, cati: 60 },
            sensory: { raads: 50, cati: 50 },
            masking: { catqAvg: 55, cati: 55, catqTotal: 100 },
            cognitive: { aqDetail: 60, raadsRoutine: 50, catiFlex: 60 }
        };
    }

    normalizeSubscale(name) {
        if (!name) return "";
        const clean = name.toLowerCase().replace(/[^a-z]/g, "");
        const aliasMap = {
            socialskill: "socialSkill", attentionswitching: "attentionSwitching", attentiontodetail: "attentionToDetail",
            communication: "communication", imagination: "imagination", socialrelatedness: "socialRelatedness",
            circumscribedinterests: "circumscribedInterests", language: "language", sensorymotor: "sensoryMotor",
            compensation: "compensation", masking: "masking", assimilation: "assimilation",
            socialinteractions: "socialInteractions", socialcamouflage: "socialCamouflage",
            selfregulatorybehaviours: "selfRegulatory", selfregulatory: "selfRegulatory",
            cognitiveinflexibility: "cognitiveInflexibility", cognitiveflexibility: "cognitiveInflexibility",
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

        const batteryEntries = Array.isArray(testBattery) ? testBattery.map(t => [t.id, t]) : Object.entries(testBattery);
        
        batteryEntries.forEach(([testId, testData]) => {
            const normalizedTestId = testId.replace(/[^a-zA-Z]/g, "");
            if (!resultsMap[normalizedTestId]) return;

            testData.questions.forEach(q => {
                const answerKey = `${testId}_${q.id}`;
                const chosenOptionKey = userAnswers[answerKey]; // Now expects the string key e.g., "definitelyAgree"
                
                if (chosenOptionKey && q.weights && q.weights[chosenOptionKey] !== undefined) {
                    const pointValue = Number(q.weights[chosenOptionKey]) || 0;
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
                const safeMax = maxPossible <= 0 ? 1 : maxPossible;
                normalizedMetrics[testId].subscales[subKey] = Math.min(100, Math.round((rawScore / safeMax) * 100));
            });
        });

        return {
            rawResults: resultsMap,
            normalizedMetrics: normalizedMetrics,
            thematicAnalysis: this.evaluateCrossTestThemes(normalizedMetrics),
            clinicalInvestigationAreas: this.evaluateClinicalInvestigationAreas(resultsMap, normalizedMetrics)
        };
    }

    evaluateCrossTestThemes(metrics) {
        const themes = [];
        const t = this.thresholds;

        if (metrics.AQ?.subscales?.socialSkill >= t.social.aq || metrics.RAADS?.subscales?.socialRelatedness >= t.social.raads || metrics.CATI?.subscales?.socialInteractions >= t.social.cati) {
            themes.push({ themeName: "Social Dynamics & Interaction Divergence", prominence: "Moderate/High", description: "Highlights a preference for intentional, direct communication and potential cognitive exhaustion from unstructured group social gatherings." });
        }
        if (metrics.RAADS?.subscales?.sensoryMotor >= t.sensory.raads || metrics.CATI?.subscales?.sensorySensitivity >= t.sensory.cati) {
            themes.push({ themeName: "Sensory Processing Sensitivity", prominence: "Moderate/High", description: "Heightened neurological responsiveness to environmental stimulation such as bright lighting, background noise, or tactile friction." });
        }
        
        const catqMasking = ((metrics.CATQ?.subscales?.masking || 0) + (metrics.CATQ?.subscales?.compensation || 0)) / 2;
        if (catqMasking >= t.masking.catqAvg || metrics.CATI?.subscales?.socialCamouflage >= t.masking.cati) {
            themes.push({ themeName: "Social Camouflaging & Adaptation", prominence: "Moderate/High", description: "Active deployment of conscious social coping strategies and internal behavioral scripts, requiring sustained mental effort." });
        }

        if (metrics.AQ?.subscales?.attentionToDetail >= t.cognitive.aqDetail || metrics.RAADS?.subscales?.circumscribedInterests >= t.cognitive.raadsRoutine || metrics.CATI?.subscales?.cognitiveInflexibility >= t.cognitive.catiFlex) {
            themes.push({ themeName: "Cognitive Systemizing & Routine Consistency", prominence: "Moderate/High", description: "High affinity for rule-based precision, deep-dive interests, and predictable routines, paired with friction around sudden disruptions." });
        }

        if (themes.length === 0) {
            themes.push({ themeName: "Sub-Threshold Trait Configuration", prominence: "Low", description: "Responses align broadly with standard non-autistic baselines, with no prominent thematic peaks identified." });
        }
        return themes;
    }

    evaluateClinicalInvestigationAreas(raw, metrics) {
        const areas = [];
        if (metrics.RAADS?.subscales?.sensoryMotor >= 50 || metrics.CATI?.subscales?.sensorySensitivity >= 50) {
            areas.push({ title: "Sensory Load & Environmental Sensitivity", severity: "Priority Focus", notes: "Sensory markers cross-validate. Investigate auditory, tactile, and visual overload triggers." });
        }
        if (raw.CATQ?.total >= 100 || metrics.CATI?.subscales?.socialCamouflage >= 65) {
            areas.push({ title: "Masking Compensation & Burnout Vulnerability", severity: "Priority Focus", notes: "Elevated masking points to intensive social compensation. Inquire about late-day exhaustion and autistic burnout." });
        }
        if (areas.length === 0) {
            areas.push({ title: "Baseline Trait Harmony", severity: "Standard Tracking", notes: "No acute cross-battery convergent elevations flagged." });
        }
        return areas;
    }
}
window.AutismAssessmentEngine = AutismAssessmentEngine;
