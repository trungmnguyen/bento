"""Pure Domain Exceptions for Bento."""

class BentoDomainError(Exception):
    """Base exception for all Bento domain errors."""
    pass


class ScenarioValidationError(BentoDomainError):
    """Raised when a scenario fails domain validation rules."""
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Scenario validation failed: {'; '.join(errors)}")


class StepExecutionError(BentoDomainError):
    """Raised when an unexpected error occurs during step execution."""
    pass
