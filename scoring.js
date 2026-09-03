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
        const clinicalInvestigationAreas = this.evaluateClinicalInvestigationAreas(resultsMap, normalizedMetrics);

        return {
            rawResults: resultsMap,
            normalizedMetrics: normalizedMetrics,
            thematicAnalysis: prominentThemes,
            clinicalInvestigationAreas: clinicalInvestigationAreas
        };
    }

    evaluateCrossTestThemes(metrics) {
        const discoveredThemes = [];

        const aqSocial = metrics.AQ?.subscales?.socialSkill || 0;
        const raadsSocial = metrics.RAADS?.subscales?.socialRelatedness || 0;
        const catiSocial = metrics.CATI?.subscales?.socialInteractions || 0;

        if (aqSocial >= 60 || raadsSocial >= 45 || catiSocial >= 60) {
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
                themeName: "Sensory Processing Sensitivity",
                prominence: prominence,
                description: "Heightened neurological responsiveness to environmental stimulation such as bright lighting, background noise, or tactile friction."
            });
        }

        const catqMasking = ((metrics.CATQ?.subscales?.masking || 0) + (metrics.CATQ?.subscales?.compensation || 0)) / 2;
        const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;

        if (catqMasking >= 55 || catiCamouflage >= 55) {
            let prominence = "Low";
            if (catqMasking >= 75 && catiCamouflage >= 75) prominence = "High";
            else if (catqMasking >= 55 || catiCamouflage >= 55) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Social Camouflaging & Adaptation",
                prominence: prominence,
                description: "Active deployment of conscious social coping strategies and internal behavioral scripts, requiring sustained mental effort."
            });
        }

        const aqDetail = metrics.AQ?.subscales?.attentionToDetail || 0;
        const raadsRoutine = metrics.RAADS?.subscales?.circumscribedInterests || 0;
        const catiFlexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;

        if (aqDetail >= 60 || raadsRoutine >= 50 || catiFlexibility >= 60) {
            let prominence = "Low";
            if (aqDetail >= 80 && raadsRoutine >= 70 && catiFlexibility >= 80) prominence = "High";
            else if (aqDetail >= 60 || raadsRoutine >= 50 || catiFlexibility >= 60) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Cognitive Systemizing & Routine Consistency",
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

    evaluateClinicalInvestigationAreas(raw, metrics) {
        const areas = [];

        // 1. Sensory Reactivity Convergence
        const raadsSensory = metrics.RAADS?.subscales?.sensoryMotor || 0;
        const catiSensory = metrics.CATI?.subscales?.sensorySensitivity || 0;
        if (raadsSensory >= 50 || catiSensory >= 50) {
            areas.push({
                title: "Sensory Load & Environmental Sensitivity",
                severity: (raadsSensory >= 70 && catiSensory >= 70) ? "Priority Focus" : "Clinical Consideration",
                notes: "Sensory markers cross-validate across RAADS-R (sensory-motor) and CATI (sensory sensitivity). Investigate auditory, tactile, and visual overload triggers in daily life, as well as the need for physical sensory decompression."
            });
        }

        // 2. High Camouflaging Masking Effect
        const catqTotal = raw.CATQ?.total || 0;
        const catqMasking = metrics.CATQ?.subscales?.masking || 0;
        const catiCamouflage = metrics.CATI?.subscales?.socialCamouflage || 0;
        if (catqTotal >= 100 || catqMasking >= 65 || catiCamouflage >= 65) {
            areas.push({
                title: "Masking Compensation & Burnout Vulnerability",
                severity: "Priority Focus",
                notes: "Elevated CAT-Q (≥100) or CATI camouflage points to intensive social compensation. This degree of masking can suppress observable markers on standard screening tools like AQ or childhood history tools. Inquire specifically about late-day exhaustion and autistic burnout."
            });
        }

        // 3. Cognitive Inflexibility and Monotropic Focus
        const raadsInterests = metrics.RAADS?.subscales?.circumscribedInterests || 0;
        const catiInflexibility = metrics.CATI?.subscales?.cognitiveInflexibility || 0;
        const aqSwitching = metrics.AQ?.subscales?.attentionSwitching || 0;
        if (raadsInterests >= 55 || catiInflexibility >= 60 || aqSwitching >= 70) {
            areas.push({
                title: "Monotropic Attention & Resistance to Disruption",
                severity: "Clinical Consideration",
                notes: "Convergence across circumscribed interests and attention-switching indicates strong monotropic flow states. Sudden task-switching or schedule changes are likely primary friction sources in occupational and relational settings."
            });
        }

        // 4. Pragmatic & Non-Verbal Communication
        const aqComm = metrics.AQ?.subscales?.communication || 0;
        const raadsLang = metrics.RAADS?.subscales?.language || 0;
        const catiComm = metrics.CATI?.subscales?.communication || 0;
        if (aqComm >= 60 || raadsLang >= 50 || catiComm >= 60) {
            areas.push({
                title: "Pragmatic Language & Literal Interpretation",
                severity: "Clinical Consideration",
                notes: "Elevated indicators in linguistic and non-verbal decoding. Explore difficulty with implied expectations, colloquialisms, turn-taking pauses, and the cognitive toll of manually decoding non-verbal facial cues."
            });
        }

        if (areas.length === 0) {
            areas.push({
                title: "Baseline Trait Harmony",
                severity: "Standard Tracking",
                notes: "No acute cross-battery convergent elevations flagged. Dimensional markers fall within normative variance across sensory, cognitive, and social domains."
            });
        }

        return areas;
    }
}

window.AutismAssessmentEngine = AutismAssessmentEngine;
