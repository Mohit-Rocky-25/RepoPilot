package ratelimit

import (
	"sync/atomic"
	"time"
	"unsafe"
)

type atomicLimiter struct {
	state unsafe.Pointer
	padding [56]byte
	perRequest time.Duration
	maxSlack time.Duration
}

type state struct {
	last time.Time
	sleepFor time.Duration
}

func newAtomicBased(rate int, opts ...Option) *atomicLimiter {
	perRequest := time.Second / time.Duration(rate)
	l := &atomicLimiter{
		perRequest: perRequest,
		maxSlack: -10 * perRequest,
	}
	initialState := state{
		last: time.Time{},
		sleepFor: 0,
	}
	atomic.StorePointer(&l.state, unsafe.Pointer(&initialState))
	return l
}

func (l *atomicLimiter) Take() time.Time {
	var newState state
	for {
		now := time.Now()
		currPtr := atomic.LoadPointer(&l.state)
		currState := (*state)(currPtr)

		if currState.last.IsZero() {
			newState = state{
				last: now,
				sleepFor: 0,
			}
		} else {
			sleepFor := currState.sleepFor + l.perRequest - now.Sub(currState.last)
			if sleepFor < l.maxSlack {
				sleepFor = l.maxSlack
			}
			newState = state{
				last: now,
				sleepFor: sleepFor,
			}
		}

		if atomic.CompareAndSwapPointer(&l.state, currPtr, unsafe.Pointer(&newState)) {
			if newState.sleepFor > 0 {
				time.Sleep(newState.sleepFor)
			}
			return now.Add(newState.sleepFor)
		}
	}
}
