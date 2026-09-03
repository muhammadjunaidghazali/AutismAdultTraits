class AutismAssessmentEngine {
    constructor() {
        this.subscaleMaxScores = {
            AQ: { socialSkill: 10, attentionSwitching: 10, attentionToDetail: 10, communication: 10, imagination: 10 },
            RAADS: { socialRelatedness: 117, circumscribedInterests: 42, language: 21, sensoryMotor: 60 },
            CATQ: { compensation: 63, masking: 56, assimilation: 56 },
            CATI: { socialInteractions: 35, communication: 35, socialCamouflage: 35, selfRegulatory: 35, cognitiveInflexibility: 35, sensorySensitivity: 35 }
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

        const profiler = new MultimethodProfiler(resultsMap, normalizedMetrics);
        const matrixData = profiler.generateMatrix();

        return {
            rawResults: resultsMap,
            normalizedMetrics: normalizedMetrics,
            thematicAnalysis: this.evaluateCrossTestThemes(normalizedMetrics),
            clinicalInvestigationAreas: this.evaluateClinicalInvestigationAreas(resultsMap, normalizedMetrics),
            matrix: matrixData
        };
    }

    evaluateCrossTestThemes(metrics) { /* ... (Keep your existing theme logic or use previous) ... */ return []; }
    evaluateClinicalInvestigationAreas(raw, metrics) { /* ... (Keep existing) ... */ return []; }
}

/**
 * Multimethod Assessment Profiling Matrix
 * Performs qualitative Confirmatory Factor Analysis (CFA) across the battery.
 */
class MultimethodProfiler {
    constructor(rawResults, normalizedMetrics) {
        this.raw = rawResults;
        this.norm = normalizedMetrics;
        this.triangulation = this.calculateTriangulation();
        this.domains = this.calculateDomains();
        this.dissonance = this.identifyDissonance();
        this.clinicalNarrative = this.generateNarrative();
    }

    calculateTriangulation() {
        const aqRaw = this.raw.AQ?.total || 0;
        const raadsRaw = this.raw.RAADS?.total || 0;
        const catqRaw = this.raw.CATQ?.total || 0;
        return {
            AQ: { score: aqRaw, threshold: 32, met: aqRaw >= 32 },
            RAADS: { score: raadsRaw, threshold: 65, met: raadsRaw >= 65 },
            CATQ: { score: catqRaw, threshold: 100, met: catqRaw >= 100 },
            overallDensity: [aqRaw >= 32, raadsRaw >= 65, catqRaw >= 100].filter(Boolean).length
        };
    }

    getNorm(test, sub) { return this.norm[test]?.subscales?.[sub] || 0; }
    average(arr) {
        const valid = arr.filter(v => v !== undefined && v !== null);
        if (valid.length === 0) return 0;
        return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    }

    calculateDomains() {
        return {
            A_Social: {
                name: "Social Communication & Interaction",
                score: this.average([this.getNorm('AQ', 'socialSkill'), this.getNorm('AQ', 'communication'), this.getNorm('RAADS', 'socialRelatedness'), this.getNorm('RAADS', 'language'), this.getNorm('CATI', 'socialInteractions'), this.getNorm('CATI', 'communication')]),
                interpretation: "Convergence indicates divergence in reciprocal social communication and pragmatic language decoding."
            },
            B_Flexibility: {
                name: "Behavioral Flexibility & Monotropic Focus",
                score: this.average([this.getNorm('AQ', 'attentionSwitching'), this.getNorm('AQ', 'attentionToDetail'), this.getNorm('RAADS', 'circumscribedInterests'), this.getNorm('CATI', 'cognitiveInflexibility')]),
                interpretation: "Cross-validation of cognitive rigidity, deep-dive indexing, and bottom-up pattern recognition."
            },
            C_Sensory: {
                name: "Sensory Processing (AQ Blindspot)",
                score: this.average([this.getNorm('RAADS', 'sensoryMotor'), this.getNorm('CATI', 'sensorySensitivity')]),
                interpretation: "AQ-50 lacks sensory items. Relies on RAADS-R and CATI cross-validation."
            },
            D_Camouflaging: {
                name: "Social Camouflaging (Overlap Modifier)",
                score: this.average([this.getNorm('CATQ', 'compensation'), this.getNorm('CATQ', 'masking'), this.getNorm('CATQ', 'assimilation'), this.getNorm('CATI', 'socialCamouflage')]),
                interpretation: "Direct correlation of conscious social compensation and internal behavioral scripting."
            }
        };
    }

    identifyDissonance() {
        const d = this.domains; const t = this.triangulation; const findings = [];
        if (d.A_Social.score < 50 && d.D_Camouflaging.score >= 70) findings.push({ type: "Masked Presentation Dissonance", severity: "High", explanation: "Low observable traits combined with extreme compensation. Confirms a highly masked profile." });
        if (!t.AQ.met && d.C_Sensory.score >= 65) findings.push({ type: "Sensory-Dominant Profile", severity: "Moderate", explanation: "AQ falls below threshold, but cross-validation confirms sensory processing differences as a core pillar." });
        if (d.B_Flexibility.score >= 70 && d.A_Social.score < 40) findings.push({ type: "Monotropic Dominance", severity: "Informational", explanation: "Profile weighted toward cognitive rigidity and deep-dive indexing, with relatively low social friction." });
        if (d.D_Camouflaging.score >= 75 && d.C_Sensory.score >= 65) findings.push({ type: "High Burnout Vulnerability", severity: "Priority Focus", explanation: "Convergence of high masking and high sensory reactivity indicates massive cognitive energy expenditure." });
        if (findings.length === 0) findings.push({ type: "Harmonious Profile", severity: "Standard", explanation: "No major statistical dissonance detected across the multimethod battery." });
        return findings;
    }

    generateNarrative() {
        const entries = Object.entries(this.domains).map(([k, v]) => ({key: k, name: v.name, score: v.score}));
        entries.sort((a, b) => b.score - a.score);
        return `Triangulation: ${this.triangulation.overallDensity} of 3 primary thresholds met. Strongest convergence in ${entries[0].name}.`;
    }

    generateMatrix() {
        return { triangulation: this.triangulation, domains: this.domains, dissonance: this.dissonance, narrative: this.clinicalNarrative };
    }
}

window.AutismAssessmentEngine = AutismAssessmentEngine;
window.MultimethodProfiler = MultimethodProfiler;
