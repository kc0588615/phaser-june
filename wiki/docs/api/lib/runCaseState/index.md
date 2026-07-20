# lib/runCaseState

## Interfaces

- [EvidenceCardContent](interfaces/EvidenceCardContent.md)
- [EvidenceFamilyCardContent](interfaces/EvidenceFamilyCardContent.md)
- [IssuedObservationRecord](interfaces/IssuedObservationRecord.md)
- [PrivateCaseV1](interfaces/PrivateCaseV1.md)
- [PrivateCaseV2](interfaces/PrivateCaseV2.md)
- [PrivateCaseV3](interfaces/PrivateCaseV3.md)
- [ReasoningEventCommit](interfaces/ReasoningEventCommit.md)
- [V3EvidenceApplicationRecord](interfaces/V3EvidenceApplicationRecord.md)

## Type Aliases

- [CitationValidation](type-aliases/CitationValidation.md)
- [GuessDecision](type-aliases/GuessDecision.md)
- [MethodChoiceDecision](type-aliases/MethodChoiceDecision.md)
- [PrivateCaseSnapshot](type-aliases/PrivateCaseSnapshot.md)
- [QualityCheckpointDecision](type-aliases/QualityCheckpointDecision.md)
- [TerminalMutationDecision](type-aliases/TerminalMutationDecision.md)

## Variables

- [RUN\_CHECKPOINT\_LIMITS](variables/RUN_CHECKPOINT_LIMITS.md)

## Functions

- [appendReasoningEvents](functions/appendReasoningEvents.md)
- [computeActualEliminatedIds](functions/computeActualEliminatedIds.md)
- [decideCheckpointMutation](functions/decideCheckpointMutation.md)
- [decideGuess](functions/decideGuess.md)
- [decideMethodChoice](functions/decideMethodChoice.md)
- [decideObservationIssuance](functions/decideObservationIssuance.md)
- [decideQualityCheckpoint](functions/decideQualityCheckpoint.md)
- [filterEliminatedCandidates](functions/filterEliminatedCandidates.md)
- [getEliminatedCandidateIds](functions/getEliminatedCandidateIds.md)
- [getRecord](functions/getRecord.md)
- [hydrateFamilyObservation](functions/hydrateFamilyObservation.md)
- [hydrateObservation](functions/hydrateObservation.md)
- [isUuid](functions/isUuid.md)
- [isV2SignatureInterpretationEligible](functions/isV2SignatureInterpretationEligible.md)
- [parseEvidenceCard](functions/parseEvidenceCard.md)
- [parseEvidenceFamilyCard](functions/parseEvidenceFamilyCard.md)
- [parseIssuedObservations](functions/parseIssuedObservations.md)
- [parsePrivateCase](functions/parsePrivateCase.md)
- [parseReasoningEvent](functions/parseReasoningEvent.md)
- [parseV3EvidenceApplications](functions/parseV3EvidenceApplications.md)
- [qualityTierForSuccessfulNode](functions/qualityTierForSuccessfulNode.md)
- [resolveRunCreationIdentifiers](functions/resolveRunCreationIdentifiers.md)
- [serverVerifyReasoningEvent](functions/serverVerifyReasoningEvent.md)
- [validateEvidenceCitations](functions/validateEvidenceCitations.md)
- [validateNodeCompletionInput](functions/validateNodeCompletionInput.md)
- [verifyReasoningEventBatch](functions/verifyReasoningEventBatch.md)
