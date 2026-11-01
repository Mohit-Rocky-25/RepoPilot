package ratelimit

import (
	"sync"
	"time"
)

type mutexLimiter struct {
	sync.Mutex
	last time.Time
	sleepFor time.Duration
	perRequest time.Duration
	maxSlack time.Duration
}

func newMutexBased(rate int, opts ...Option) *mutexLimiter {
	perRequest := time.Second / time.Duration(rate)
	return &mutexLimiter{
		perRequest: perRequest,
		maxSlack: -10 * perRequest,
	}
}

func (l *mutexLimiter) Take() time.Time {
	l.Lock()
	defer l.Unlock()

	now := time.Now()
	if l.last.IsZero() {
		l.last = now
		return now
	}

	l.sleepFor += l.perRequest - now.Sub(l.last)
	if l.sleepFor < l.maxSlack {
		l.sleepFor = l.maxSlack
	}

	l.last = now
	if l.sleepFor > 0 {
		time.Sleep(l.sleepFor)
		l.last = l.last.Add(l.sleepFor)
	}

	return l.last
}
