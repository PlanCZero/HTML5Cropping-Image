//if (window.location.protocol == 'file:') {
//    alert('To test this demo properly please use a local server such as XAMPP or WAMP. See README.md for more details.');
//}
var resizeableImage = function (image_target) {
    // Some variable and settings
    var $container,
        orig_src = new Image(),
        image_target = $(image_target).get(0),
        $overlay = $('.overlay'),
        event_state = {},
        constrain = false,
        min_width = 100, // Change as required
        min_height = 100,
        max_width = 800, // Change as required
        max_height = 900,
        resize_canvas = document.createElement('canvas'),
        zoomDelta = 0.01,
        currentScale = 1;

    init = function () {
        // When resizing, we will always use this copy of the original as the base
        orig_src.src = image_target.src;
        // Wrap the image with the container and add resize handles
        $(image_target).wrap('<div class="resize-container"></div>');
        $overlay.html('<div class="overlay-inner"></div>');
        // Assign the container to a variable
        $container = $(image_target).parent('.resize-container');

        // Add events
        $container.on('mousedown touchstart', 'img', startMoving);
        $('#freesplacement').on('change', freePlacement);

        $('#submitCrop').on('click', crop);
        $('#reset').on('click', function () {
            reset();
        });

        $('#fitWidth').on('click', fitwidth);
        $('#fitHeight').on('click', fitheight);

        initSlide();
        $container.offset({
            'left': 0,
            'top': 0
        });
    };
    freePlacement = function () {
        if ($(this).is(":checked")) {
            $('.overlay-inner')
            .before('<span class="resize-handle resize-handle-nw"></span>')
            .before('<span class="resize-handle resize-handle-ne"></span>')
            .after('<span class="resize-handle resize-handle-se"></span>')
            .after('<span class="resize-handle resize-handle-sw"></span>');
            $overlay.removeClass('pointer-events-none');
            $overlay.on('mousedown touchstart', '.resize-handle', freePlaceResize);
        }
        else {
            $overlay.html('<div class="overlay-inner"></div>');
            $overlay.addClass('pointer-events-none');
        }
    };
    initSlide = function () {
        // Get croping box size.
        var box_width = $('.overlay').width(), box_height = $('.overlay').height();
        //  slide nubmer is in between 1-200
        //  Key is find min slide number
        var min_width = (box_width / orig_src.width) * 100;
        var min_height = (box_height / orig_src.height) * 100;
        $("#slider").slider({
            orientation: "vertical",
            value: 100,
            min: 0,
            max: 200,
            step: 1,
            slide: function (event, ui) {
                if (ui.value >= Math.ceil(min_width) && ui.value >= Math.ceil(min_height)) {
                    zoom(ui.value);
                    $("#slider_value").val(ui.value + '%');
                } else {
                    return false;
                }
            },
            start: function (event, ui) {
                //console.log('start slide');
            },
            stop: function (event, ui) {
                resizeImage(resize_canvas.width, resize_canvas.height);
            }
        });
        $("#slider_value").val($("#slider").slider("value") + '%');
    };
    startResize = function (e) {
        e.preventDefault();
        e.stopPropagation();
        saveEventState(e);
        $(document).on('mousemove touchmove', resizing);
        $(document).on('mouseup touchend', endResize);
    };
    freePlaceResize = function (e) {
          transparentOverlay(0.0);
        e.preventDefault();
        e.stopPropagation();
        cropboxEventState(e);
        $(document).on('mousemove touchmove', resizingCropbox);
        $(document).on('mouseup touchend', endResizeCropbox);
    };
    endResizeCropbox = function (e) {
        reset();
        e.preventDefault();
        $(document).off('mouseup touchend', endResizeCropbox);
        $(document).off('mousemove touchmove', resizingCropbox);

        //console.log(  event_state.cropbox_width);
        transparentOverlay(0.3);
    };
    endResize = function (e) {
        e.preventDefault();
        $(document).off('mouseup touchend', endResize);
        $(document).off('mousemove touchmove', resizing);
    };

    saveEventState = function (e) {
        // Save the initial event details and container state
        event_state.container_width = $container.width();
        event_state.container_height = $container.height();
        event_state.container_left = $container.offset().left;
        event_state.container_top = $container.offset().top;
        event_state.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        event_state.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // This is a fix for mobile safari
        // For some reason it does not allow a direct copy of the touches property
        if (typeof e.originalEvent.touches !== 'undefined') {
            event_state.touches = [];
            $.each(e.originalEvent.touches, function (i, ob) {
                event_state.touches[i] = {};
                event_state.touches[i].clientX = 0 + ob.clientX;
                event_state.touches[i].clientY = 0 + ob.clientY;
            });
        }
        event_state.evnt = e;
    };
    cropboxEventState = function (e) {
        event_state.cropbox_width = $overlay.width();
        event_state.cropbox_height = $overlay.height();
        event_state.cropbox_left = $overlay.offset().left;
        event_state.cropbox_top = $overlay.offset().top;
        event_state.mouse_x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        event_state.mouse_y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // This is a fix for mobile safari
        // For some reason it does not allow a direct copy of the touches property
        if (typeof e.originalEvent.touches !== 'undefined') {
            event_state.touches = [];
            $.each(e.originalEvent.touches, function (i, ob) {
                event_state.touches[i] = {};
                event_state.touches[i].clientX = 0 + ob.clientX;
                event_state.touches[i].clientY = 0 + ob.clientY;
            });
        }
        event_state.evnt = e;
    }
    resizingCropbox = function (e) {
        var mouse = {}, width, height, left, top, offset = $container.offset();
        mouse.x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        mouse.y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // Position image differently depending on the corner dragged and constraints
        if ($(event_state.evnt.target).hasClass('resize-handle-se')) {
            width = mouse.x - event_state.cropbox_left;
            height = mouse.y - event_state.cropbox_top;
            left = event_state.cropbox_left;
            top = event_state.cropbox_top;
        } else if ($(event_state.evnt.target).hasClass('resize-handle-sw')) {
            width = event_state.cropbox_width - (mouse.x - event_state.cropbox_left);
            height = mouse.y - event_state.cropbox_top;
            left = mouse.x;
            top = event_state.cropbox_top;
        } else if ($(event_state.evnt.target).hasClass('resize-handle-nw')) {
            width = event_state.cropbox_width - (mouse.x - event_state.cropbox_left);
            height = event_state.cropbox_height - (mouse.y - event_state.cropbox_top);
            left = mouse.x;
            top = mouse.y;
            if (constrain || e.shiftKey) {
                top = mouse.y - ((width / orig_src.width * orig_src.height) - height);
            }
        } else if ($(event_state.evnt.target).hasClass('resize-handle-ne')) {
            width = mouse.x - event_state.container_left;
            height = event_state.container_height - (mouse.y - event_state.container_top);
            left = event_state.container_left;
            top = mouse.y;
            if (constrain || e.shiftKey) {
                top = mouse.y - ((width / orig_src.width * orig_src.height) - height);
            }
        }

event_state.last_width=width;
event_state.last_height=height;
        // // Optionally maintain aspect ratio
        // if (constrain || e.shiftKey) {
        //     height = width / orig_src.width * orig_src.height;
        // }
        //
        // if (width > min_width && height > min_height && width < max_width && height < max_height) {
        //     // To improve performance you might limit how often resizeImage() is called
        //     resizeImage(400, 400);
        //     // Without this Firefox will not re-calculate the the image dimensions until drag end
        //     $container.offset({ 'left': left, 'top': top });
        // }
      //  $overlay.offset({ 'left': left, 'top': top });
        $overlay.css({ 'width': width, 'height': height });



        // console.log('left:'+left+', top:'+top);
        // console.log('width:'+width+', height:'+height);
        // var inner= $('<style>.overlay-inner::after,.overlay-inner::before{height:' + height + 'px;}</style>');
        //   $('head').append(inner);
    }
    transparentOverlay = function (opacity) {
        //    var _s=$('<style>.overlay::before,.overlay::after,.overlay-inner::after,.overlay-inner::before{height:'+height+'px;}</style>');
        var _s = $('<style>.overlay::before,.overlay::after,.overlay-inner::after,.overlay-inner::before{opacity:' + opacity + ';}.overlay-inner::after,.overlay-inner::before{height:' + event_state.last_height + 'px;}</style>');
        // re-add style to header
        var styles = $('head>style');
        for (var i = styles.length; i--;) {
            var style = styles[i];
            style.parentNode.removeChild(style);
        }
        $('head').append(_s);
        //$overlay.data('css',_s);
    };
    resizing = function (e) {
        var mouse = {}, width, height, left, top, offset = $container.offset();
        mouse.x = (e.clientX || e.pageX || e.originalEvent.touches[0].clientX) + $(window).scrollLeft();
        mouse.y = (e.clientY || e.pageY || e.originalEvent.touches[0].clientY) + $(window).scrollTop();

        // Position image differently depending on the corner dragged and constraints
        if ($(event_state.evnt.target).hasClass('resize-handle-se')) {
            width = mouse.x - event_state.container_left;
            height = mouse.y - event_state.container_top;
            left = event_state.container_left;
            top = event_state.container_top;
        } else if ($(event_state.evnt.target).hasClass('resize-handle-sw')) {
            width = event_state.container_width - (mouse.x - event_state.container_left);
            height = mouse.y - event_state.container_top;
            left = mouse.x;
            top = event_state.container_top;
        } else if ($(event_state.evnt.target).hasClass('resize-handle-nw')) {
            width = event_state.container_width - (mouse.x - event_state.container_left);
            height = event_state.container_height - (mouse.y - event_state.container_top);
            left = mouse.x;
            top = mouse.y;
            if (constrain || e.shiftKey) {
                top = mouse.y - ((width / orig_src.width * orig_src.height) - height);
            }
        } else if ($(event_state.evnt.target).hasClass('resize-handle-ne')) {
            width = mouse.x - event_state.container_left;
            height = event_state.container_height - (mouse.y - event_state.container_top);
            left = event_state.container_left;
            top = mouse.y;
            if (constrain || e.shiftKey) {
                top = mouse.y - ((width / orig_src.width * orig_src.height) - height);
            }
        }

        // Optionally maintain aspect ratio
        if (constrain || e.shiftKey) {
            height = width / orig_src.width * orig_src.height;
        }

        if (width > min_width && height > min_height && width < max_width && height < max_height) {
            // To improve performance you might limit how often resizeImage() is called
            resizeImage(400, 400);
            // Without this Firefox will not re-calculate the the image dimensions until drag end
            $container.offset({ 'left': left, 'top': top });
        }
        //  $('.overlay-inner').offset({ 'left': left, 'top': top });
    }
    reset = function () {
        initSlide();
        currentScale = 1;
        $(image_target).removeAttr('style');
        resizeImage(orig_src.width, orig_src.height)
    };
    zoom = function (scale) {
        var w = orig_src.width, h = orig_src.height, currentScale = scale / 100;
        var _w = (w * (currentScale < 1 ? 100 - (currentScale * 100) : (currentScale - 1) * 100)) / 100;
        var _h = (h * (currentScale < 1 ? 100 - (currentScale * 100) : (currentScale - 1) * 100)) / 100;

        var box_width = $('.overlay').width(),
          box_height = $('.overlay').height();

        if (currentScale > 1) {
            $(image_target).css({ 'width': w + _w + 'px', 'height': h + _h + 'px' });
            resize_canvas.width = (w + _w);
            resize_canvas.height = (h + _h);
        } else if (currentScale < 1) {
            $(image_target).css({ 'width': w - _w + 'px', 'height': h - _h + 'px' });
            resize_canvas.width = (w - _w);
            resize_canvas.height = (h - _h);
        } else {
            $(image_target).css({ 'width': w + 'px', 'height': h + 'px' });
            resize_canvas.width = (w);
            resize_canvas.height = (h);
        }
    };
    fitwidth = function (e) {
        initSlide();
        var box_width = $('.overlay').width(), box_height = $('.overlay').height(), left = $('.overlay').offset().left, top = $('.overlay').offset().top;
        $(image_target).css({ 'width': (box_width + 5) + 'px' });
        $container.offset({
            'left': left,
            'top': top
        });
        resizeImage((box_width + 5), box_height);
    }
    fitheight = function (e) {
        initSlide();
        var box_width = $('.overlay').width(), box_height = $('.overlay').height(), left = $('.overlay').offset().left, top = $('.overlay').offset().top;
        $(image_target).css({ 'height': (box_height + 5) + 'px' });
        $container.offset({
            'left': left,
            'top': top
        });
        resizeImage(box_width, (box_height + 5));
    }
    resizeImage = function (width, height) {
        resize_canvas.width = width;
        resize_canvas.height = height;
        resize_canvas.getContext('2d').drawImage(orig_src, 0, 0, width, height);
        $(image_target).attr('src', resize_canvas.toDataURL("image/png"));
    };
    startMoving = function (e) {
        e.preventDefault();
        e.stopPropagation();
        saveEventState(e);
        $(document).on('mousemove touchmove', moving);
        $(document).on('mouseup touchend', endMoving);
    };

    endMoving = function (e) {
        e.preventDefault();
        $(document).off('mouseup touchend', endMoving);
        $(document).off('mousemove touchmove', moving);
    };

    moving = function (e) {
        try {
            var mouse = {}, touches;
            e.preventDefault();
            e.stopPropagation();

            touches = e.originalEvent.touches;

            mouse.x = (e.clientX || e.pageX || touches[0].clientX) + $(window).scrollLeft();
            mouse.y = (e.clientY || e.pageY || touches[0].clientY) + $(window).scrollTop();

            var _left = mouse.x - (event_state.mouse_x - event_state.container_left);
            var _top = mouse.y - (event_state.mouse_y - event_state.container_top);

            // Not allow to drag out of the box.
            // if (_left <= 0) return false;
            // else $container.offset({
            //     'left': _left
            // });
            // if (_top <= 0) return false;
            // else $container.offset({
            //     'top': _top
            // });
            // Allow to drag out of the box.
            $container.offset({
                'left': _left,
                'top': _top
            });
            // Watch for pinch zoom gesture while moving
            if (event_state.touches && event_state.touches.length > 1 && touches.length > 1) {
                var width = event_state.container_width, height = event_state.container_height;
                var a = event_state.touches[0].clientX - event_state.touches[1].clientX;
                a = a * a;
                var b = event_state.touches[0].clientY - event_state.touches[1].clientY;
                b = b * b;
                var dist1 = Math.sqrt(a + b);

                a = e.originalEvent.touches[0].clientX - touches[1].clientX;
                a = a * a;
                b = e.originalEvent.touches[0].clientY - touches[1].clientY;
                b = b * b;
                var dist2 = Math.sqrt(a + b);

                var ratio = dist2 / dist1;

                width = width * ratio;
                height = height * ratio;
                // To improve performance you might limit how often resizeImage() is called
                resizeImage(width, height);
            }
        }
        catch (err) {
            console.log(err.message);
        }
    };

    crop = function () {
        //Find the part of the image that is inside the crop box
        var crop_canvas,
            left = $('.overlay').offset().left - $container.offset().left,
            top = $('.overlay').offset().top - $container.offset().top,
            width = $('.overlay').width(),
            height = $('.overlay').height();

        crop_canvas = document.createElement('canvas');
        crop_canvas.width = width;
        crop_canvas.height = height;

        crop_canvas.getContext('2d').drawImage(image_target, left, top, width, height, 0, 0, width, height);
        window.open(crop_canvas.toDataURL("image/png"));
    }

    init();
};

// Kick everything off with the target image
resizeableImage($('.resize-image'));
