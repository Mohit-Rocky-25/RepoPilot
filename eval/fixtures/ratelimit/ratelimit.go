package ratelimit

import (
	"time"
)

// Limiter represents a rate limiter that throttles execution.
type Limiter interface {
	Take() time.Time
}

// Option configures Limiter behavior.
type Option func(l *limiterOptions)

type limiterOptions struct {
	slack int
	per   time.Duration
}

// WithoutSlack disables accumulating slack.
func WithoutSlack(l *limiterOptions) {
	l.slack = 0
}

// Per changes the time interval used for rate calculation.
func Per(d time.Duration) Option {
	return func(l *limiterOptions) {
		l.per = d
	}
}

// New returns a new Limiter given a rate in operations per second.
func New(rate int, opts ...Option) Limiter {
	return newAtomicBased(rate, opts...)
}
