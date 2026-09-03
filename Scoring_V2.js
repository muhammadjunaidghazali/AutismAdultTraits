/**

* Scoring_V2.js
* ---
* Clinical Psychometric Assessment Scoring Engine
*
* Instruments:
* AQ
* RAADS-R
* CAT-Q
* CAT-I
*
* IMPORTANT:
* This engine is suitable for client-side display/progress logic
* and clinician-side presentation.
*
* The Google Apps Script backend MUST remain the authoritative
* scoring layer for stored clinical results.
*
* Expected test structure:
*
* {
* AQ: {
* ```
  id: "AQ",
  ```
* ```
  title: "Autism Spectrum Quotient",
  ```
* ```
  questions: [
  ```
* ```
    {
  ```
* ```
      id: 1,
  ```
* ```
      text: "...",
  ```
* ```
      options: ["...", "...", "...", "..."],
  ```
* ```
      weights: {
  ```
* ```
        0: 0,
  ```
* ```
        1: 1,
  ```
* ```
        2: 0,
  ```
* ```
        3: 1
  ```
* ```
      },
  ```
* ```
      subscale: "socialSkill"
  ```
* ```
    }
  ```
* ```
  ]
  ```
* }
* }
*
* Response object:
*
* {
* AQ_1: 0,
* AQ_2: 2,
* ...
* }
  */

(function (global) {
"use strict";

```
class AutismAssessmentEngine {

    constructor() {

        /*
         * Canonical subscale names.
         *
         * These are used internally so minor naming differences
         * in the Tests JSON do not break scoring.
         */
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


        /*
         * Legacy/default maximums.
         *
         * These should NOT be treated as the ultimate source of
         * truth when item-level weights are available.
         *
         * They are retained for compatibility with existing
         * dashboards and older test definitions.
         */
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


        /*
         * Instrument metadata.
         *
         * Keep this separate from scoring logic so the UI can
         * safely display titles and descriptions without having
         * to know anything about calculation.
         */
        this.instrumentMetadata = {

            AQ: {
                title: "Autism Spectrum Quotient",
                shortTitle: "AQ"
            },

            RAADS: {
                title: "Ritvo Autism Asperger Diagnostic Scale",
                shortTitle: "RAADS-R"
            },

            CATQ: {
                title: "Camouflaging Autistic Traits Questionnaire",
                shortTitle: "CAT-Q"
            },

            CATI: {
                title: "Camouflaging Autistic Traits Inventory",
                shortTitle: "CAT-I"
            }
        };
    }


    /* =========================================================
     * NORMALIZATION
     * ========================================================= */

    normalizeTestId(testId) {

        if (!testId) {
            return "";
        }

        const clean = String(testId)
            .toUpperCase()
            .replace(/[^A-Z]/g, "");

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

        if (!name) {
            return "";
        }

        const clean = String(name)
            .toLowerCase()
            .replace(/[^a-z]/g, "");

        const aliasMap = {

            socialskill:
                "socialSkill",

            attentionswitching:
                "attentionSwitching",

            attentiontodetail:
                "attentionToDetail",

            communication:
                "communication",

            imagination:
                "imagination",

            socialrelatedness:
                "socialRelatedness",

            circumscribedinterests:
                "circumscribedInterests",

            language:
                "language",

            sensorymotor:
                "sensoryMotor",

            compensation:
                "compensation",

            masking:
                "masking",

            assimilation:
                "assimilation",

            socialinteractions:
                "socialInteractions",

            socialcamouflage:
                "socialCamouflage",

            selfregulatory:
                "selfRegulatory",

            selfregulatorybehaviours:
                "selfRegulatory",

            selfregulatorybehaviors:
                "selfRegulatory",

            cognitiveinflexibility:
                "cognitiveInflexibility",

            cognitiveflexibility:
                "cognitiveInflexibility",

            sensorysensitivity:
                "sensorySensitivity"
        };

        return aliasMap[clean] || clean;
    }


    /* =========================================================
     * TEST BATTERY HELPERS
     * ========================================================= */

    getBatteryEntries(testBattery) {

        if (!testBattery) {
            return [];
        }

        if (Array.isArray(testBattery)) {

            return testBattery
                .filter(Boolean)
                .map(test => [
                    test.id,
                    test
                ]);
        }

        return Object.entries(testBattery);
    }


    getTestData(testBattery, testId) {

        if (!testBattery) {
            return null;
        }

        if (Array.isArray(testBattery)) {

            return testBattery.find(test => {

                return this.normalizeTestId(test.id) ===
                    this.normalizeTestId(testId);

            }) || null;
        }

        const direct = testBattery[testId];

        if (direct) {
            return direct;
        }

        const normalized = this.normalizeTestId(testId);

        const match = Object.entries(testBattery)
            .find(([key]) => {
                return this.normalizeTestId(key) === normalized;
            });

        return match ? match[1] : null;
    }


    getExpectedResponseCount(testBattery) {

        let count = 0;

        this.getBatteryEntries(testBattery)
            .forEach(([testId, testData]) => {

                const normalizedTestId =
                    this.normalizeTestId(testId);

                if (!this.subscaleDefinitions[normalizedTestId]) {
                    return;
                }

                const questions =
                    Array.isArray(testData.questions)
                        ? testData.questions
                        : [];

                count += questions.length;
            });

        return count;
    }


    getExpectedResponsesByTest(testBattery) {

        const output = {};

        this.getBatteryEntries(testBattery)
            .forEach(([testId, testData]) => {

                const normalized =
                    this.normalizeTestId(testId);

                if (!this.subscaleDefinitions[normalized]) {
                    return;
                }

                output[normalized] =
                    Array.isArray(testData.questions)
                        ? testData.questions.length
                        : 0;
            });

        return output;
    }


    /* =========================================================
     * RESULT STRUCTURE
     * ========================================================= */

    createEmptyResults() {

        const results = {};

        Object.keys(this.subscaleDefinitions)
            .forEach(testId => {

                results[testId] = {
                    total: 0,
                    answered: 0,
                    missing: 0,
                    maximum: 0,
                    subscales: {}
                };

                this.subscaleDefinitions[testId]
                    .forEach(subscale => {

                        results[testId]
                            .subscales[subscale] = 0;
                    });
            });

        return results;
    }


    /* =========================================================
     * ANSWER SCORING
     * ========================================================= */

    getAnswerIndex(value) {

        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value === "number" &&
            Number.isInteger(value)) {

            return value;
        }

        const parsed = Number(value);

        if (Number.isInteger(parsed)) {
            return parsed;
        }

        return null;
    }


    getQuestionPointValue(question, chosenIndex) {

        if (!question) {
            return 0;
        }

        if (!question.weights) {
            return 0;
        }

        const weights = question.weights;

        /*
         * Normal expected structure:
         *
         * {
         *   0: 0,
         *   1: 1,
         *   2: 0,
         *   3: 1
         * }
         */

        if (
            Object.prototype.hasOwnProperty.call(
                weights,
                chosenIndex
            )
        ) {

            const value =
                Number(weights[chosenIndex]);

            return Number.isFinite(value)
                ? value
                : 0;
        }


        /*
         * Some JSON definitions may serialize the keys
         * unexpectedly. Fall back to Object.values().
         */
        const values = Object.values(weights);

        if (
            chosenIndex >= 0 &&
            chosenIndex < values.length
        ) {

            const value =
                Number(values[chosenIndex]);

            return Number.isFinite(value)
                ? value
                : 0;
        }

        return 0;
    }


    getQuestionMaximum(question) {

        if (!question || !question.weights) {
            return 0;
        }

        const values =
            Object.values(question.weights)
                .map(Number)
                .filter(Number.isFinite);

        if (!values.length) {
            return 0;
        }

        return Math.max.apply(null, values);
    }


    /* =========================================================
     * AUTHORITATIVE CALCULATION FUNCTION
     * ========================================================= */

    calculateScores(userAnswers, testBattery) {

        userAnswers =
            userAnswers &&
            typeof userAnswers === "object"
                ? userAnswers
                : {};

        const rawResults =
            this.createEmptyResults();

        const maxResults =
            this.createEmptyResults();


        this.getBatteryEntries(testBattery)
            .forEach(([testId, testData]) => {

                const normalizedTestId =
                    this.normalizeTestId(testId);

                if (
                    !rawResults[normalizedTestId]
                ) {
                    return;
                }

                const questions =
                    Array.isArray(testData.questions)
                        ? testData.questions
                        : [];


                questions.forEach(question => {

                    const answerKey =
                        `${testId}_${question.id}`;

                    const chosenIndex =
                        this.getAnswerIndex(
                            userAnswers[answerKey]
                        );


                    /*
                     * Maximum possible score is derived from
                     * the actual item weights.
                     */
                    const questionMaximum =
                        this.getQuestionMaximum(
                            question
                        );

                    rawResults[normalizedTestId]
                        .maximum += questionMaximum;


                    /*
                     * No response.
                     */
                    if (
                        chosenIndex === null ||
                        chosenIndex < 0
                    ) {

                        rawResults[normalizedTestId]
                            .missing += 1;

                        return;
                    }


                    const pointValue =
                        this.getQuestionPointValue(
                            question,
                            chosenIndex
                        );


                    rawResults[normalizedTestId]
                        .answered += 1;


                    rawResults[normalizedTestId]
                        .total += pointValue;


                    const targetSubscale =
                        this.normalizeSubscale(
                            question.subscale
                        );


                    if (
                        targetSubscale &&
                        rawResults[
                            normalizedTestId
                        ].subscales[
                            targetSubscale
                        ] !== undefined
                    ) {

                        rawResults[
                            normalizedTestId
                        ].subscales[
                            targetSubscale
                        ] += pointValue;
                    }


                    /*
                     * Track maximum score at subscale level.
                     */
                    if (
                        targetSubscale &&
                        maxResults[
                            normalizedTestId
                        ].subscales[
                            targetSubscale
                        ] !== undefined
                    ) {

                        maxResults[
                            normalizedTestId
                        ].subscales[
                            targetSubscale
                        ] += questionMaximum;
                    }
                });
            });


        /*
         * Build normalized percentage metrics.
         */
        const normalizedMetrics = {};


        Object.keys(rawResults)
            .forEach(testId => {

                normalizedMetrics[testId] = {
                    totalPercent: this.toPercentage(
                        rawResults[testId].total,
                        rawResults[testId].maximum
                    ),
                    subscales: {}
                };


                Object.keys(
                    rawResults[testId].subscales
                ).forEach(subscale => {

                    const rawScore =
                        rawResults[testId]
                            .subscales[subscale];

                    const dynamicMaximum =
                        maxResults[testId]
                            .subscales[subscale];


                    const fallbackMaximum =
                        this.subscaleMaxScores[
                            testId
                        ]?.[subscale] || 0;


                    const maximum =
                        dynamicMaximum > 0
                            ? dynamicMaximum
                            : fallbackMaximum;


                    normalizedMetrics[testId]
                        .subscales[subscale] =
                        this.toPercentage(
                            rawScore,
                            maximum
                        );
                });
            });


        const completion =
            this.calculateCompletion(
                userAnswers,
                testBattery
            );


        const thematicAnalysis =
            this.evaluateCrossTestThemes(
                normalizedMetrics
            );


        const clinicalInvestigationAreas =
            this.evaluateClinicalInvestigationAreas(
                rawResults,
                normalizedMetrics
            );


        return {

            rawResults,

            normalizedMetrics,

            completion,

            thematicAnalysis,

            clinicalInvestigationAreas,

            generatedAt:
                new Date().toISOString()
        };
    }


    /* =========================================================
     * PERCENTAGE / COMPLETION
     * ========================================================= */

    toPercentage(score, maximum) {

        score = Number(score) || 0;
        maximum = Number(maximum) || 0;

        if (maximum <= 0) {
            return 0;
        }

        const percentage =
            (score / maximum) * 100;

        return Math.max(
            0,
            Math.min(
                100,
                Math.round(percentage)
            )
        );
    }


    calculateCompletion(userAnswers, testBattery) {

        const expected =
            this.getExpectedResponseCount(
                testBattery
            );

        const answered =
            Object.keys(userAnswers || {})
                .filter(key => {

                    const value =
                        userAnswers[key];

                    return (
                        value !== undefined &&
                        value !== null &&
                        value !== ""
                    );
                }).length;


        return {
            expected,
            answered: Math.min(answered, expected),
            missing: Math.max(
                0,
                expected - answered
            ),
            percentage:
                expected > 0
                    ? Math.round(
                        Math.min(
                            100,
                            (answered / expected) * 100
                        )
                    )
                    : 0,

            complete:
                expected > 0 &&
                answered >= expected
        };
    }


    /* =========================================================
     * CROSS-TEST THEMATIC ANALYSIS
     * ========================================================= */

    evaluateCrossTestThemes(metrics) {

        const discoveredThemes = [];


        const aqSocial =
            metrics.AQ?.subscales?.socialSkill || 0;

        const raadsSocial =
            metrics.RAADS?.subscales?.socialRelatedness || 0;

        const catiSocial =
            metrics.CATI?.subscales?.socialInteractions || 0;


        /*
         * Social interaction pattern.
         */
        if (
            aqSocial >= 60 &&
            raadsSocial >= 60 &&
            catiSocial >= 60
        ) {

            discoveredThemes.push({

                id: "social_interaction_pattern",

                title:
                    "Social Interaction Differences",

                prominence:
                    "High",

                description:
                    "Elevated scores across multiple social interaction domains suggest an area that may warrant further clinical exploration.",

                evidence: [
                    "AQ Social Skill",
                    "RAADS-R Social Relatedness",
                    "CAT-I Social Interactions"
                ]
            });

        } else if (
            (
                aqSocial >= 60 &&
                raadsSocial >= 60
            ) ||
            (
                raadsSocial >= 60 &&
                catiSocial >= 60
            )
        ) {

            discoveredThemes.push({

                id:
                    "social_interaction_pattern",

                title:
                    "Social Interaction Differences",

                prominence:
                    "Moderate",

                description:
                    "Some measures indicate elevated social interaction characteristics that may benefit from clinical exploration.",

                evidence: [
                    "Cross-measure social interaction domains"
                ]
            });
        }


        /*
         * Detail / restricted-interest pattern.
         */
        const aqDetail =
            metrics.AQ?.subscales?.attentionToDetail || 0;

        const raadsInterests =
            metrics.RAADS?.subscales?.circumscribedInterests || 0;


        if (
            aqDetail >= 60 &&
            raadsInterests >= 60
        ) {

            discoveredThemes.push({

                id:
                    "focused_attention_pattern",

                title:
                    "Focused Attention and Interests",

                prominence:
                    "High",

                description:
                    "Elevated scores in attention-to-detail and focused-interest domains may indicate a pattern worth exploring clinically.",

                evidence: [
                    "AQ Attention to Detail",
                    "RAADS-R Circumscribed Interests"
                ]
            });
        }


        /*
         * Sensory pattern.
         */
        const raadsSensory =
            metrics.RAADS?.subscales?.sensoryMotor || 0;

        const catiSensory =
            metrics.CATI?.subscales?.sensorySensitivity || 0;


        if (
            raadsSensory >= 60 &&
            catiSensory >= 60
        ) {

            discoveredThemes.push({

                id:
                    "sensory_pattern",

                title:
                    "Sensory Sensitivity",

                prominence:
                    "High",

                description:
                    "Converging elevations in sensory-related domains suggest that sensory experiences may be clinically relevant.",

                evidence: [
                    "RAADS-R Sensory-Motor",
                    "CAT-I Sensory Sensitivity"
                ]
            });
        }


        /*
         * Camouflaging pattern.
         */
        const catqMasking =
            metrics.CATQ?.subscales?.masking || 0;

        const catqCompensation =
            metrics.CATQ?.subscales?.compensation || 0;

        const catiCamouflage =
            metrics.CATI?.subscales?.socialCamouflage || 0;


        if (
            catqMasking >= 60 &&
            catqCompensation >= 60 &&
            catiCamouflage >= 60
        ) {

            discoveredThemes.push({

                id:
                    "camouflaging_pattern",

                title:
                    "Camouflaging and Compensation",

                prominence:
                    "High",

                description:
                    "Elevated camouflaging and compensation scores across measures may warrant exploration of social adaptation strategies and associated effort.",

                evidence: [
                    "CAT-Q Masking",
                    "CAT-Q Compensation",
                    "CAT-I Social Camouflage"
                ]
            });

        } else if (
            catqMasking >= 60 ||
            catqCompensation >= 60 ||
            catiCamouflage >= 60
        ) {

            discoveredThemes.push({

                id:
                    "camouflaging_pattern",

                title:
                    "Camouflaging and Compensation",

                prominence:
                    "Moderate",

                description:
                    "Some camouflaging-related domains are elevated and may warrant clinical exploration.",

                evidence: [
                    "CAT-Q / CAT-I camouflaging domains"
                ]
            });
        }


        /*
         * Cognitive flexibility pattern.
         */
        const catiInflexibility =
            metrics.CATI?.subscales?.cognitiveInflexibility || 0;

        const aqSwitching =
            metrics.AQ?.subscales?.attentionSwitching || 0;


        if (
            catiInflexibility >= 60 &&
            aqSwitching >= 60
        ) {

            discoveredThemes.push({

                id:
                    "cognitive_flexibility_pattern",

                title:
                    "Cognitive Flexibility and Switching",

                prominence:
                    "High",

                description:
                    "Elevated scores in cognitive inflexibility and attention switching may indicate an area for further exploration.",

                evidence: [
                    "CAT-I Cognitive Inflexibility",
                    "AQ Attention Switching"
                ]
            });
        }


        return discoveredThemes;
    }


    /* =========================================================
     * CLINICAL INVESTIGATION AREAS
     *
     * These are NOT diagnoses.
     *
     * They are structured prompts for clinician review.
     * ========================================================= */

    evaluateClinicalInvestigationAreas(
        rawResults,
        normalizedMetrics
    ) {

        const areas = [];


        const addArea = (
            id,
            title,
            rationale,
            domains
        ) => {

            areas.push({

                id,
                title,
                rationale,
                domains
            });
        };


        const social =
            normalizedMetrics.AQ?.subscales?.socialSkill || 0;

        const raadsSocial =
            normalizedMetrics.RAADS?.subscales?.socialRelatedness || 0;


        if (
            social >= 60 ||
            raadsSocial >= 60
        ) {

            addArea(
                "social_communication",
                "Social Communication and Interaction",
                "Elevated social interaction domains may justify exploring interpersonal experiences, communication style, reciprocity, and contextual functioning.",
                [
                    "AQ Social Skill",
                    "RAADS-R Social Relatedness"
                ]
            );
        }


        const masking =
            normalizedMetrics.CATQ?.subscales?.masking || 0;

        const compensation =
            normalizedMetrics.CATQ?.subscales?.compensation || 0;

        const assimilation =
            normalizedMetrics.CATQ?.subscales?.assimilation || 0;


        if (
            masking >= 60 ||
            compensation >= 60 ||
            assimilation >= 60
        ) {

            addArea(
                "camouflaging",
                "Camouflaging and Social Adaptation",
                "Elevated CAT-Q domains may justify exploring strategies used to adapt socially, perceived effort, authenticity, exhaustion, and contextual differences in presentation.",
                [
                    "CAT-Q Masking",
                    "CAT-Q Compensation",
                    "CAT-Q Assimilation"
                ]
            );
        }


        const sensory =
            normalizedMetrics.CATI?.subscales?.sensorySensitivity || 0;

        const raadsSensory =
            normalizedMetrics.RAADS?.subscales?.sensoryMotor || 0;


        if (
            sensory >= 60 ||
            raadsSensory >= 60
        ) {

            addArea(
                "sensory_experience",
                "Sensory Experience",
                "Elevated sensory-related domains may justify exploring sensory sensitivities, environmental triggers, regulation strategies, and functional impact.",
                [
                    "CAT-I Sensory Sensitivity",
                    "RAADS-R Sensory-Motor"
                ]
            );
        }


        const inflexibility =
            normalizedMetrics.CATI?.subscales?.cognitiveInflexibility || 0;

        const switching =
            normalizedMetrics.AQ?.subscales?.attentionSwitching || 0;


        if (
            inflexibility >= 60 ||
            switching >= 60
        ) {

            addArea(
                "flexibility",
                "Cognitive Flexibility and Transitions",
                "Elevated switching or flexibility-related domains may justify exploring routines, transitions, uncertainty, change, and adaptive coping.",
                [
                    "AQ Attention Switching",
                    "CAT-I Cognitive Inflexibility"
                ]
            );
        }


        const interests =
            normalizedMetrics.RAADS?.subscales?.circumscribedInterests || 0;

        const detail =
            normalizedMetrics.AQ?.subscales?.attentionToDetail || 0;


        if (
            interests >= 60 ||
            detail >= 60
        ) {

            addArea(
                "focused_interests",
                "Focused Attention and Interests",
                "Elevated domains may justify exploring sustained interests, attention allocation, detail orientation, and their functional context.",
                [
                    "RAADS-R Circumscribed Interests",
                    "AQ Attention to Detail"
                ]
            );
        }


        return areas;
    }


    /* =========================================================
     * VALIDATION
     * ========================================================= */

    validateResponses(
        userAnswers,
        testBattery
    ) {

        const errors = [];

        const expectedKeys = [];


        this.getBatteryEntries(testBattery)
            .forEach(([testId, testData]) => {

                const normalized =
                    this.normalizeTestId(testId);

                if (!this.subscaleDefinitions[normalized]) {
                    return;
                }

                const questions =
                    Array.isArray(testData.questions)
                        ? testData.questions
                        : [];


                questions.forEach(question => {

                    const key =
                        `${testId}_${question.id}`;

                    expectedKeys.push(key);


                    const value =
                        userAnswers?.[key];


                    if (
                        value === undefined ||
                        value === null ||
                        value === ""
                    ) {

                        errors.push({
                            key,
                            reason:
                                "Missing response"
                        });

                        return;
                    }


                    const index =
                        this.getAnswerIndex(value);


                    if (
                        index === null ||
                        index < 0 ||
                        index >=
                        (
                            Array.isArray(
                                question.options
                            )
                                ? question.options.length
                                : 999
                        )
                    ) {

                        errors.push({
                            key,
                            reason:
                                "Invalid response index"
                        });
                    }
                });
            });


        return {

            valid:
                errors.length === 0,

            expected:
                expectedKeys.length,

            answered:
                expectedKeys.length -
                errors.length,

            errors
        };
    }


    /* =========================================================
     * SCORE SUMMARY
     * ========================================================= */

    getClinicianSummary(results) {

        if (!results || !results.rawResults) {
            return null;
        }

        const summary = {};


        Object.keys(results.rawResults)
            .forEach(testId => {

                const test =
                    results.rawResults[testId];

                summary[testId] = {

                    title:
                        this.instrumentMetadata[
                            testId
                        ]?.title || testId,

                    shortTitle:
                        this.instrumentMetadata[
                            testId
                        ]?.shortTitle || testId,

                    total:
                        test.total,

                    maximum:
                        test.maximum,

                    percentage:
                        results.normalizedMetrics?.[
                            testId
                        ]?.totalPercent || 0,

                    answered:
                        test.answered,

                    missing:
                        test.missing,

                    subscales:
                        test.subscales
                };
            });


        return summary;
    }


    /* =========================================================
     * EXPORT SAFE DATA
     *
     * Removes unnecessary functions / references and creates
     * a JSON-safe object for transmission to the backend.
     * ========================================================= */

    getSerializableResults(results) {

        if (!results) {
            return null;
        }

        return JSON.parse(
            JSON.stringify(results)
        );
    }
}


/*
 * Browser exposure.
 *
 * Allows:
 *
 * const engine = new AutismAssessmentEngine();
 *
 * or:
 *
 * window.AutismAssessmentEngine
 */
global.AutismAssessmentEngine =
    AutismAssessmentEngine;


/*
 * Optional singleton.
 *
 * Existing UI code can use:
 *
 * window.assessmentEngine
 */
if (!global.assessmentEngine) {

    global.assessmentEngine =
        new AutismAssessmentEngine();
}
```

})(typeof window !== "undefined"
? window
: globalThis);
