var layout = {

    count: 0,
    div_width: 160,
    div_container: '',
    max_items: -1,
    top_margin: 50,

    getNumColumns: function(width) {
        return Math.floor(width / this.div_width);
    },

    getLeftMargin: function(width, columns) {
        return (width - (columns * this.div_width)) / 2;
    },

    initialize: function(container, width) {
        this.div_container = container;
        this.padWithLoadingCells(width);
    },

    addToLayout: function(width, items) {

        var columns = this.getNumColumns(width);
        var left_margin = this.getLeftMargin(width, columns);
        var top_margin = this.top_margin;
        var index_offset = this.count;
        var div_width = this.div_width;
        var div_container = this.div_container;

        $.each(items, function(index, value) {
            var image = value.image;
            image = image.replace('_88_88', '_130_130');

            var id = value.link.replace('/data_objects/', '');

            var filename = value.filename;
            var name = value.name;

            var row = Math.floor((index_offset + index) / columns);
            var column = (index_offset + index) % columns;

            var div_left = left_margin + column * div_width;
            var div_top = top_margin + row * div_width;

            $(div_container).append('<div id="cell'+id+'" class="cell life" style="position:absolute;left:'+div_left+'px;top:'+div_top+'px;width:'+div_width+'px;height:'+div_width+'px;"><img id="'+id+'" src="'+image+'" data-filename="'+filename+'" data-name="'+name+'"></div>');

            $('#cell'+id).click(function(eventObject) {
                var element = eventObject.toElement;
                var img = $(element).attr('src').replace('_130_130', '_580_360');
                var full_size_img = img.replace('_580_360', '');
                $('#full_size_image_link').attr('href', full_size_img);
                $('#enlarged_img').attr('src', '');
                $('#enlarged_img').attr('src', img);
                $('#filename').html($(element).attr('data-filename'));
                $('#name').html($(element).attr('data-name'));
                $('#detail_link').attr('href', 'http://eol.org/data_objects/'+$(element).attr('id'));

                $.colorbox({
                    transition: 'none',
                    width: 580,
                    height: 600,
                    inline: true,
                    href: '#popup'
                });
            });

        });

        this.count += items.length;

        this.padWithLoadingCells(width);
    },

    doLayout: function(width) {
        var columns = this.getNumColumns(width);
        var left_margin = this.getLeftMargin(width, columns);
        var top_margin = this.top_margin;
        var div_width = this.div_width;

        $('.cell.life').each(function(index) {
            var row = Math.floor(index / columns);
            var column = index % columns;

            var div_left = left_margin + column * div_width;
            var div_top = top_margin + row * div_width;

            $(this).css("left", div_left);
            $(this).css("top", div_top);
        });

        this.padWithLoadingCells(width);
    },

    padWithLoadingCells: function(width) {
        if (this.max_items >= 0 && this.count >= this.max_items) {
            $('.loading').each(function(index) {
                $(this).css("display", "none");
            });
            return;
        }

        var columns = this.getNumColumns(width);
        var start_col = this.count % columns;
        var num_loading = columns - start_col;
        var last_row = Math.floor(this.count / columns);

        // Make the number of required loading cells if there isn't enough
        var existing = $('.loading').length;
        for (var i = 0; i < (columns - existing); i++) {
            $(this.div_container).append('<div class="cell loading" style="position:absolute;display:none;"><img src="loading.gif"></div>');
        }

        // Figure out how to layout the loading cells based on number of items already loaded
        var left_margin = this.getLeftMargin(width, columns);
        var top_margin = this.top_margin;
        var div_width = this.div_width;

        $('.loading').each(function(index) {
            if (start_col < columns) {
                var div_left = left_margin + start_col * div_width;
                var div_top = top_margin + last_row * div_width;

                $(this).css("left", div_left);
                $(this).css("top", div_top);
                $(this).css("display", "block");

                start_col++;
            } else {
                $(this).css("display", "none");
            }
        });
    }

};

function getNextPage(force_load) {
	force_load = typeof force_load !== 'undefined' ? force_load : false;

	if (loading && !force_load) {
		return false;
	}

	page += 1;

	$.ajax({
		url: 'http://dannysu.com/eol/api.php?q='+search_term+'&page='+page+'&callback=?',
		success: function(data) {
            layout.max_items = data.total_count;
            layout.addToLayout($(document).width(), data.items);

			loading = false;
		},
		dataType: 'jsonp'
	});

	loading = true;
	return true;
}

var page = 0;
var loading = false;

var current_width = 0;
var search_term = "*";

$(document).ready(function() {
    $('#content').css('height', $(window).height() + 1);

    layout.initialize('#content', $(document).width());

    var query = window.location.search;
    if (query.indexOf("?q=") >= 0) {
        search_term = query.substring(query.indexOf("?q=") + "?q=".length);
    } else {
        search_term = "*";
    }

	getNextPage(true);
	getNextPage(true);
	getNextPage(true);

	$(window).scroll(function() {
		if ($(window).scrollTop() >= $(document).height() - $(window).height() * 3) {
			if (getNextPage()) {
				getNextPage(true);
				getNextPage(true);
			}
		}
	});

    current_width = $(document).width();
    $(window).resize(function() {
        if (current_width != $(document).width()) {
            current_width = $(document).width();

            layout.doLayout(current_width);
        }
    });
});
