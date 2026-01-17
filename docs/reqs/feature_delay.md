# Delay and End Element Types Documentation (AI)

## Overview

This document describes two new element types added to the course system:

1. **Delay Element**: Allows course elements to be sent with a delay, similar to the existing 'jump' element's 'wait' option, but without the 'jump' functionality.

2. **End Element**: Stops course execution, preventing any further elements from being sent.

## Delay Element

### Purpose

The Delay element adds a specified element to a waiting list, which will be processed after the specified time interval has passed. Unlike the Jump element, it doesn't require user interaction and automatically continues to the specified element after the delay.

### Attributes

- `type`: Must be set to `delay`
- `text` (optional): A message to display when the delay is initiated
- `wait` (required): The time interval to wait before continuing to the next element
  - Format: Uses the same format as Jump's wait option: `[days]d:[hours]h:[minutes]m:[seconds]s`
  - Examples: `30s`, `2m`, `1h:30m`, `1d:12h`
- `goto` (required): The ID of the element to continue to after the delay

### Example

```yaml
intro_2:
  type: delay
  text: Setting up a 30-second delay...
  wait: 30s
  goto: intro_3
```

## End Element

### Purpose

The End element stops course execution, preventing any further elements from being sent. It's useful for ending a course or a branch of a course.

### Attributes

- `type`: Must be set to `end`
- `text` (optional): A final message to display when the course ends

### Example

```yaml
intro_8:
  type: end
  text: |
    Thank you for exploring the course!
    The course has now ended. No further elements will be sent.
```

## Implementation Details

- The Delay element uses the same waiting mechanism as the Jump element with the 'wait' option, adding entries to the `waiting_element` table.
- The End element doesn't trigger the next element in the course sequence.


# Original Prompt
## Goal

I need the following feature:

Some elements of a course must be send to the user with delay. Delay can be measured in hours or days. Such elements can form a chain: an element is added to a queue only after the previous element is pulled from a queue and activated.

## Similar functionality

This must be aligned with existing feature for 'jump' elements like this:

"""
element_0:
  type: jump
  text: Let's contunue?
  options:
  - text: No, let's stop
    goto: element_1
  - text: Yes, but tomorrow
    wait: 1d
  - text: OK, let's go
"""

It has 'wait' option with a timeout (1 day in this example). If the user selects this option, the element is added to waiting_element DB table to activate later.

Waiting/activation is implemented via AsyncIOScheduler: main.py 315-319

## Implementation notes

Now, I need similar waiting/activation functionality but without 'jump'. It could be implemented by elements of 2 new types:

1. 'delay' elements with 'wait' and 'goto' attributes working similar to these attributes of 'jump'. The difference is that 'delay' element is not sent immediately, they just add their 'goto' elements to waiting_element list.

2. 'end' element without attributes that just stops course execution. It's needed because elements referenced in 'goto' (and 'delay' elements following them) must be placed AFTER 'end' in the course — they can be sent only as waiting elements.

## YOUR TASK

Analyze everything and make an implementation plan for the new feature. Do NOT make any changes in the code unless I allow this.
