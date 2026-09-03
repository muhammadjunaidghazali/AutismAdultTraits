/**
 * Standalone Clinical Psychometric & Thematic Evaluation Engine
 * Architecture: Self-Contained Client-Side Rule Engine
 * Author Focus: Support Framework for Muhammad Junaid Ghazali
 */

class AutismAssessmentEngine {
    constructor() {
        // Maximum scoring parameters for metric normalization (Raw / Max * 100)
        this.subscaleMaxScores = {
            AQ: { socialSkill: 10, attentionSwitching: 10, attentionToDetail: 10, communication: 10, imagination: 10 },
            RAADS: { socialRelatedness: 117, circumscribedInterests: 42, language: 21, sensoryMotor: 60 },
            CAT_Q: { compensation: 63, masking: 56, assimilation: 56 },
            CATI: { socialInteractions: 35, communication: 35, socialCamouflage: 35, selfRegulatory: 35, cognitiveInflexibility: 35, sensorySensitivity: 35 }
        };

        // Explicit definitions for reverse-scored item matrices
        this.reverseScoredItems = {
            // CATI utilizes specific graded items where high numbers represent neurotypical traits
            CATI: [8, 15, 19, 23, 28] 
        };
    }

    /**
     * Main calculation coordinator
     * @param {Object} userAnswers - Key-value map of responses format: {"AQ_1": 1, "CATI_8": 5}
     * @param {Array} testBattery - The loaded structural configuration matrix from tests.json
     * @returns {Object} Deep object tree containing raw totals, subscale tallies, percentages, and themes
     */
    calculateScores(userAnswers, testBattery) {
        const resultsMap = {
            AQ: { total: 0, subscales: { socialSkill: 0, attentionSwitching: 0, attentionToDetail: 0, communication: 0, imagination: 0 } },
            RAADS: { total: 0, subscales: { socialRelatedness: 0, circumscribedInterests: 0, language: 0, sensoryMotor: 0 } },
            CAT_Q: { total: 0, subscales: { compensation: 0, masking: 0, assimilation: 0 } },
            CATI: { total: 0, subscales: { socialInteractions: 0, communication: 0, socialCamouflage: 0, selfRegulatory: 0, cognitiveInflexibility: 0, sensorySensitivity: 0 } }
        };

        // Step 1: Compute Raw Score Aggregations by running through the loaded database structure
        testBattery.forEach(test => {
            const testId = test.id; // "AQ", "RAADS", "CAT_Q", "CATI"
            
            test.questions.forEach(q => {
                const answerKey = `${testId}_${q.id}`;
                const chosenIndex = userAnswers[answerKey]; // Array index selected by client (0, 1, 2, 3...)

                if (chosenIndex !== undefined && q.options && q.options[chosenIndex]) {
                    let pointValue = q.options[chosenIndex].weight;

                    // Apply reverse scoring parameters if explicitly flagged inside structural matrices
                    if (this.reverseScoredItems[testId] && this.reverseScoredItems[testId].includes(q.id)) {
                        // For a standard 1-5 layout, invert pointValue securely
                        pointValue = 6 - pointValue; 
                    }

                    // Tally Total Scores
                    resultsMap[testId].total += pointValue;

                    // Map specific item IDs back to target subscales dynamically
                    const subscaleKey = q.subscale; // E.g., "socialRelatedness"
                    if (subscaleKey && resultsMap[testId].subscales[subscaleKey] !== undefined) {
                        resultsMap[testId].subscales[subscaleKey] += pointValue;
                    }
                }
            });
        });

        // Step 2: Generate Uniform Normalized Metrics (Percentages)
        const normalizedMetrics = {};
        Object.keys(resultsMap).forEach(testId => {
            normalizedMetrics[testId] = { subscales: {} };
            Object.keys(resultsMap[testId].subscales).forEach(subKey => {
                const rawScore = resultsMap[testId].subscales[subKey];
                const maxPossible = this.subscaleMaxScores[testId][subKey] || 1;
                normalizedMetrics[testId].subscales[subKey] = Math.round((rawScore / maxPossible) * 100);
            });
        });

        // Step 3: Run Cross-Compiled Thematic Map Algorithms
        const prominentThemes = this.evaluateCrossTestThemes(normalizedMetrics);

        return {
            rawResults: resultsMap,
            normalizedMetrics: normalizedMetrics,
            thematicAnalysis: prominentThemes
        };
    }

    /**
     * Deterministic rule-based structural intersection matrices
     * Evaluates data points horizontally across all 4 separate screeners
     * @param {Object} metrics - Normalized subscale tracking maps
     * @returns {Array} List of prominent behavioral profiles containing supportive descriptors
     */
    evaluateCrossTestThemes(metrics) {
        const discoveredThemes = [];

        // Theme 1: Social Communication & Interaction Divergence
        const aqSocial = metrics.AQ.subscales.socialSkill;
        const raadsSocial = metrics.RAADS.subscales.socialRelatedness;
        const catiSocial = metrics.CATI.subscales.socialInteractions;
        
        if (aqSocial >= 70 || raadsSocial >= 50 || catiSocial >= 70) {
            let prominence = "Low";
            if (aqSocial >= 80 && raadsSocial >= 65 && catiSocial >= 80) prominence = "High";
            else if (aqSocial >= 60 || raadsSocial >= 45 || catiSocial >= 60) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Social Dynamics & Interaction Divergence",
                prominence: prominence,
                description: "This pattern highlights an explicit preference for non-traditional communication systems. It often manifests as finding standard neurotypical social small talk exhausting, preferring direct logic-driven language structures, and choosing deep, intentional engagements over unstructured group gatherings."
            });
        }

        // Theme 2: Sensory Processing Sensitivities & Environment Interactivity
        const raadsSensory = metrics.RAADS.subscales.sensoryMotor;
        const catiSensory = metrics.CATI.subscales.sensorySensitivity;

        if (raadsSensory >= 50 || catiSensory >= 50) {
            let prominence = "Low";
            if (raadsSensory >= 70 && catiSensory >= 70) prominence = "High";
            else if (raadsSensory >= 50 || catiSensory >= 50) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Sensory Processing Profile",
                prominence: prominence,
                description: "Indicators reflect heightened neurological responsiveness to environmental stimulation. This tracking typically shows up as sensitivity to flickering lights, background noises, text fabrics, or taste textures, requiring conscious energy allocation to prevent exhaustion in public environments."
            });
        }

        // Theme 3: Social Camouflaging, Masking, & Strategic Compensation
        const catqMasking = (metrics.CAT_Q.subscales.masking + metrics.CAT_Q.subscales.compensation) / 2;
        const catiCamouflage = metrics.CATI.subscales.socialCamouflage;

        if (catqMasking >= 60 || capiCamouflage >= 60) {
            let prominence = "Low";
            if (catqMasking >= 75 && catiCamouflage >= 75) prominence = "High";
            else if (catqMasking >= 55 || catiCamouflage >= 55) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Social Camouflaging & Cognitive Adaptation",
                prominence: prominence,
                description: "Results indicate active deployment of social coping strategies, such as internalizing behavioral scripts or consciously imitating expressions to navigate complex environments. While highly effective for masking differences, this adaptation often requires significant cognitive fuel and mental energy."
            });
        }

        // Theme 4: Focus Inflexibility & Deep Systemizing Adaptations
        const aqDetail = metrics.AQ.subscales.attentionToDetail;
        const raadsRoutine = metrics.RAADS.subscales.circumscribedInterests;
        const catiFlexibility = metrics.CATI.subscales.cognitiveInflexibility;

        if (aqDetail >= 70 || raadsRoutine >= 60 || catiFlexibility >= 70) {
            let prominence = "Low";
            if (aqDetail >= 80 && raadsRoutine >= 70 && catiFlexibility >= 80) prominence = "High";
            else if (aqDetail >= 60 || raadsRoutine >= 50 || catiFlexibility >= 60) prominence = "Moderate";

            discoveredThemes.push({
                themeName: "Cognitive Systemizing & Focus Variations",
                prominence: prominence,
                description: "This cluster marks a high affinity for analytical precision, rule-based processes, and predictable schedules. It is associated with an exceptional capability to recognize subtle pattern discrepancies, alongside experiencing friction or stress when plans are suddenly disrupted without advanced notice."
            });
        }

        // Default assurance profile if indicator metrics fall below baseline cutoffs
        if (discoveredThemes.length === 0) {
            discoveredThemes.push({
                themeName: "Sub-Threshold Trait Configuration",
                prominence: "Low",
                description: "Your responses tracking across the evaluation battery align broadly with standard non-autistic baseline variations, showing no structural peaks or prominent thematic indicator criteria at this time."
            });
        }

        return discoveredThemes;
    }
}

// Global scope encapsulation for seamless cross-linking inside index.html script tags
window.AutismAssessmentEngine = AutismAssessmentEngine;

