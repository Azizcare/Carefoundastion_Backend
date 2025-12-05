const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const { status, isActive, page = 1, limit = 10, showAll } = req.query;

    const query = {};
    
    // Only apply filters if explicitly provided or if not admin/showAll
    // For admin panel, showAll=true will show all events regardless of status/active
    if (!showAll || showAll !== 'true') {
      // Default behavior for public: show only published and active events
      if (status) {
        query.status = status;
      } else {
        query.status = 'published'; // Default for public
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true' || isActive === true;
      } else {
        query.isActive = true; // Default for public
      }
    }
    // If showAll=true, don't apply status/isActive filters - show everything

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort('-date')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Event.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: events.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event'
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
  try {
    const {
      heading,
      shortBrief,
      description,
      date,
      location,
      picture,
      videos,
      images,
      status = 'published'
    } = req.body;

    // Validate required fields
    if (!heading || !shortBrief || !description || !date || !location || !picture) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: heading, shortBrief, description, date, location, and picture'
      });
    }

    // Validate time field (required by model)
    const { time } = req.body;
    if (!time) {
      return res.status(400).json({
        status: 'error',
        message: 'Event time is required'
      });
    }

    // Prepare event data
    const eventData = {
      heading: heading.trim(),
      shortBrief: shortBrief.trim(),
      description: description.trim(),
      date: new Date(date),
      time: time.trim(), // Required field
      location: location.trim(),
      picture: typeof picture === 'string' ? { url: picture, publicId: null } : picture,
      videos: videos || [],
      images: images || [],
      status,
      createdBy: req.user.id || req.user._id
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create event',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Check if user is admin or created the event
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this event'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    // Handle date update
    if (req.body.date) {
      event.date = new Date(req.body.date);
    }

    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update event'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Check if user is admin or created the event
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this event'
      });
    }

    await event.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete event'
    });
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
exports.getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      eventType: 'upcoming',
      date: { $gte: now },
      status: 'published',
      isActive: true
    })
      .populate('createdBy', 'name email')
      .sort('date')
      .lean();

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upcoming events'
    });
  }
};

// @desc    Get completed events
// @route   GET /api/events/completed
// @access  Public
exports.getCompletedEvents = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      eventType: 'completed',
      date: { $lt: now },
      status: 'published',
      isActive: true
    })
      .populate('createdBy', 'name email')
      .sort('-date')
      .lean();

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get completed events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch completed events'
    });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    if (!event.registration || !event.registration.isOpen) {
      return res.status(400).json({
        status: 'error',
        message: 'Event registration is closed'
      });
    }

    // Check registration deadline
    if (event.registration.registrationDeadline && new Date() > event.registration.registrationDeadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration deadline has passed'
      });
    }

    // Check if already registered
    const alreadyRegistered = event.registration.registeredParticipants.some(
      p => p.user.toString() === req.user.id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already registered for this event'
      });
    }

    // Check max participants
    if (event.registration.maxParticipants && 
        event.registration.registeredParticipants.length >= event.registration.maxParticipants) {
      return res.status(400).json({
        status: 'error',
        message: 'Event is full'
      });
    }

    // Add registration
    event.registration.registeredParticipants.push({
      user: req.user.id,
      status: 'registered'
    });

    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Successfully registered for event',
      data: event
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register for event'
    });
  }
};

// @desc    Cancel event registration
// @route   DELETE /api/events/:id/register
// @access  Private
exports.cancelRegistration = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    const participantIndex = event.registration.registeredParticipants.findIndex(
      p => p.user.toString() === req.user.id.toString()
    );

    if (participantIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'You are not registered for this event'
      });
    }

    event.registration.registeredParticipants[participantIndex].status = 'cancelled';
    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel registration'
    });
  }
};

