const Blog = require('../models/Blog');
const User = require('../models/User');

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private/Admin
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      category,
      tags,
      featuredImage,
      isPublished,
      status,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Validate and set category
    const validCategories = ['success_story', 'media_coverage', 'impact_story', 'event_highlights', 'announcement', 'general'];
    let finalCategory = 'general';
    if (category) {
      // Map common category names to valid enum values
      const categoryMap = {
        'blog': 'general',
        'news': 'announcement',
        'story': 'success_story',
        'event': 'event_highlights',
        'impact': 'impact_story',
        'media': 'media_coverage'
      };
      const normalizedCategory = category.toLowerCase().trim();
      if (validCategories.includes(normalizedCategory)) {
        finalCategory = normalizedCategory;
      } else if (categoryMap[normalizedCategory]) {
        finalCategory = categoryMap[normalizedCategory];
      }
    }

    // Prepare blog data
    const blogData = {
      title: title.trim(),
      content: content.trim(),
      author: req.user.id || req.user._id,
      excerpt: excerpt?.trim() || '',
      category: finalCategory,
      status: status || (isPublished ? 'published' : 'draft'),
      isFeatured: isFeatured || false
    };

    // Handle slug
    if (slug) {
      blogData.slug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Handle tags - convert string to array if needed
    if (tags) {
      if (typeof tags === 'string') {
        blogData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        blogData.tags = tags.map(tag => typeof tag === 'string' ? tag.trim() : tag).filter(tag => tag);
      }
    }

    // Handle featuredImage - convert string to object if needed
    if (featuredImage) {
      if (typeof featuredImage === 'string') {
        blogData.featuredImage = {
          url: featuredImage,
          publicId: null,
          caption: ''
        };
      } else if (typeof featuredImage === 'object') {
        blogData.featuredImage = {
          url: featuredImage.url || featuredImage,
          publicId: featuredImage.publicId || null,
          caption: featuredImage.caption || ''
        };
      }
    }

    // Set publishedAt if status is published
    if (blogData.status === 'published') {
      blogData.publishedAt = new Date();
    }

    const blog = await Blog.create(blogData);

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create blog',
      ...(process.env.NODE_ENV === 'development' && { details: error.stack })
    });
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const { category, status, isFeatured, search, page = 1, limit = 10 } = req.query;

    let query = {};
    
    // Public can only see published blogs
    if (!req.user || req.user.role !== 'admin') {
      query.status = 'published';
    } else if (status) {
      query.status = status;
    }

    if (category) query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      count: blogs.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: blogs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get blog by slug
// @route   GET /api/blogs/slug/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Check if published
    if (blog.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'This blog is not published'
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const {
      title,
      slug,
      content,
      excerpt,
      category,
      tags,
      featuredImage,
      isPublished,
      status,
      isFeatured
    } = req.body;

    // Prepare update data
    const updateData = {};

    // Validate and set category
    if (category !== undefined) {
      const validCategories = ['success_story', 'media_coverage', 'impact_story', 'event_highlights', 'announcement', 'general'];
      let finalCategory = blog.category || 'general';
      if (category) {
        // Map common category names to valid enum values
        const categoryMap = {
          'blog': 'general',
          'news': 'announcement',
          'story': 'success_story',
          'event': 'event_highlights',
          'impact': 'impact_story',
          'media': 'media_coverage'
        };
        const normalizedCategory = category.toLowerCase().trim();
        if (validCategories.includes(normalizedCategory)) {
          finalCategory = normalizedCategory;
        } else if (categoryMap[normalizedCategory]) {
          finalCategory = categoryMap[normalizedCategory];
        }
      }
      updateData.category = finalCategory;
    }

    // Handle title
    if (title !== undefined) {
      updateData.title = title.trim();
    }

    // Handle content
    if (content !== undefined) {
      updateData.content = content.trim();
    }

    // Handle excerpt
    if (excerpt !== undefined) {
      updateData.excerpt = excerpt?.trim() || '';
    }

    // Handle slug
    if (slug !== undefined) {
      if (slug && slug.trim()) {
        const newSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // Only update slug if it's different from current slug
        if (newSlug !== blog.slug) {
          // Check for uniqueness
          const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
          if (existingBlog) {
            return res.status(400).json({
              success: false,
              message: 'A blog with this slug already exists'
            });
          }
          updateData.slug = newSlug;
        }
      }
    }

    // Handle tags - convert string to array if needed
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        updateData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        updateData.tags = tags.map(tag => typeof tag === 'string' ? tag.trim() : tag).filter(tag => tag);
      } else {
        updateData.tags = [];
      }
    }

    // Handle featuredImage - convert string to object if needed
    if (featuredImage !== undefined) {
      if (!featuredImage || featuredImage === '' || featuredImage.trim() === '') {
        // Set to null to remove the image
        updateData.featuredImage = null;
      } else if (typeof featuredImage === 'string') {
        updateData.featuredImage = {
          url: featuredImage.trim(),
          publicId: null,
          caption: ''
        };
      } else if (typeof featuredImage === 'object' && featuredImage !== null) {
        updateData.featuredImage = {
          url: featuredImage.url || featuredImage,
          publicId: featuredImage.publicId || null,
          caption: featuredImage.caption || ''
        };
      }
    }

    // Handle status
    if (status !== undefined) {
      updateData.status = status;
    } else if (isPublished !== undefined) {
      updateData.status = isPublished ? 'published' : 'draft';
    }

    // Handle isFeatured
    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured;
    }

    // Update published date if status changed to published
    if (updateData.status === 'published' && blog.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    // Apply updates using findByIdAndUpdate for better validation
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: updatedBlog
    });
  } catch (error) {
    console.error('Update blog error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Handle duplicate key error (e.g., slug)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry. This slug or title already exists.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update blog',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.stack,
        errorName: error.name,
        errorCode: error.code
      })
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    await blog.deleteOne();

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Increment blog views
// @route   PUT /api/blogs/:id/views
// @access  Public
exports.incrementViews = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      views: blog.views
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

