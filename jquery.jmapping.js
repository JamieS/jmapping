/*
 * jMapping v1.4.0 - jQuery plugin for creating Google Maps
 *
 * Copyright (c) 2009-2010 Brian Landau (Viget Labs)
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 */

if (GMap2){
  GMap2.prototype.centerAndZoomOnBounds = function(bounds) {
    this.setCenter(bounds.getCenter(), this.getBoundsZoomLevel(bounds));
  };
}

(function($){
  $.jMapping = function(map_elm, options){
    var settings, gmarkers, mapped, map, markerManager, places, bounds, jMapper;
    map_elm = (typeof map_elm == "string") ? $(map_elm).get(0) : map_elm;
    
    if (!($(map_elm).data('jMapping'))){ // TODO: Should we use a different test here?
      settings = $.extend(true, {}, $.jMapping.defaults);
      $.extend(true, settings, options);
      gmarkers = {};
      
      var init = function(doUpdate){
        var info_window_selector, min_zoom, bounds_zoom_level;

        info_window_selector = [
          settings.side_bar_selector, 
          settings.location_selector, 
          settings.info_window_selector
        ].join(' ');
        $(info_window_selector).hide();

        places = getPlaces();
        bounds = getBounds(doUpdate);

        if (doUpdate){
          gmarkers = {};
          markerManager.clearMarkers();
          map.checkResize();
          map.centerAndZoomOnBounds(bounds);
        } else {
          map = createMap();
          markerManager = new MarkerManager(map);
        }

        places.each(function(){
          var marker = createMarker(this);
          if (!(settings.link_selector === false)){
            setupLink(this);
          }
          $(document).trigger('markerCreated.jMapping', [marker]);
        });

        bounds_zoom_level = map.getBoundsZoomLevel(bounds);
        min_zoom = (bounds_zoom_level < 7) ? 0 : (bounds_zoom_level - 7);
        markerManager.addMarkers(gmarkersArray(), min_zoom);
        markerManager.refresh();

        if (!(settings.link_selector === false) && !doUpdate){
          attachMapsEventToLinks();
        }
      };
      
      var createMap = function(){
        map = new GMap2(map_elm);
        if ($.isFunction(settings.map_config)){
          settings.map_config(map);
        } else {
          map.setMapType(G_NORMAL_MAP);
          map.addControl(new GSmallMapControl());
        }
        map.centerAndZoomOnBounds(bounds);
        if (typeof settings.default_zoom_level == "number"){
          map.setZoom(settings.default_zoom_level);
        }
        return map;
      };
      
      var getPlaces = function(){
        return $(settings.side_bar_selector+' '+settings.location_selector);
      };
      
      var getPlacesData = function(doUpdate){
        return places.map(function(){
          if (doUpdate){
            $(this).data('metadata', false);
          }
          return $(this).metadata(settings.metadata_options);
        });
      };
      
      var getBounds = function(doUpdate){
        var places_data = getPlacesData(doUpdate);
        var newBounds = new GLatLngBounds(
          $.jMapping.makeGLatLng(places_data[0].point), 
          $.jMapping.makeGLatLng(places_data[0].point) );

        for (var i=1, len = places_data.length ; i<len; i++) {
          newBounds.extend($.jMapping.makeGLatLng(places_data[i].point));
        }
        return newBounds;
      };
      
      var setupLink = function(place_elm){
        var $place_elm = $(place_elm),
            location_data = $place_elm.metadata(settings.metadata_options),
            link = $place_elm.find(settings.link_selector);

        link.attr('href', ("#" + location_data.id));
      };
      
      var chooseIconOptions = function(category){
        if (settings.category_icon_options){
          if ($.isFunction(settings.category_icon_options)){
            return settings.category_icon_options(category);
          } else {
            return settings.category_icon_options[category] || settings.category_icon_options['default'];
          }
        } else {
          return {};
        }
      };

      var createMarker = function(place_elm){
        var $place_elm = $(place_elm), place_data, point, marker, $info_window_elm, custom_icon, icon_options;

        place_data = $place_elm.metadata(settings.metadata_options);
        point = $.jMapping.makeGLatLng(place_data.point);
        if (settings.category_icon_options){
          icon_options = chooseIconOptions(place_data.category);
          if (typeof icon_options === "string"){
            custom_icon =  new GIcon(G_DEFAULT_ICON, icon_options);
          } else if (icon_options instanceof GIcon){
            custom_icon = icon_options;
          } else {
            if (!icon_options.style) icon_options.style = 'Marker';
            custom_icon = MapIconMaker['create'+icon_options.style+'Icon'](icon_options);
          }
          
          marker = new GMarker(point, {icon: custom_icon});
        } else {
          marker = new GMarker(point);
        }

        $info_window_elm = $place_elm.find(settings.info_window_selector);
        if ($info_window_elm.length > 0){
          marker.bindInfoWindowHtml(
            $info_window_elm.html(), 
            {maxWidth: settings.info_window_max_width}
          );
        }

        gmarkers[parseInt(place_data.id, 10)] = marker;
        return marker;
      };
      
      var attachMapsEventToLinks = function(){
        var location_link_selector = [
          settings.side_bar_selector, 
          settings.location_selector, 
          settings.link_selector
        ].join(' ');

        $(location_link_selector).live('click', function(e){
          e.preventDefault();
          var marker_index = parseInt($(this).attr('href').split('#')[1], 10);
          GEvent.trigger(gmarkers[marker_index], "click");
        });
      };
      
      var gmarkersArray = function(){
        var marker_arr = [];
        $.each(gmarkers, function(key, value){
          marker_arr.push(value);
        });
        return marker_arr;
      };
      
      if (GBrowserIsCompatible()) {
        if ($(document).trigger('beforeMapping.jMapping', [settings]) != false){
          init();
          mapped = true;
        } else {
          mapped = false;
        }
        jMapper = {
          gmarkers: gmarkers,
          settings: settings,
          mapped: mapped,
          map: map,
          markerManager: markerManager,
          gmarkersArray: gmarkersArray,
          getBounds: getBounds,
          getPlacesData: getPlacesData,
          getPlaces: getPlaces,
          update: function(){
            if ($(document).trigger('beforeUpdate.jMapping', [this])  != false){
              
              init(true);
              this.map = map;
              this.gmarkers = gmarkers;
              this.markerManager = markerManager;
              $(document).trigger('afterUpdate.jMapping', [this]);
            }
          }
        };
        $(document).trigger('afterMapping.jMapping', [jMapper]);
        return jMapper;
      } else {
        mapped = false;
        return null;
      }
    } else {
      return $(map_elm).data('jMapping');
    }
  };
  
  $.extend($.jMapping, {
    defaults: {
      side_bar_selector: '#map-side-bar:first',
      location_selector: '.map-location',
      link_selector: 'a.map-link',
      info_window_selector: '.info-box',
      info_window_max_width: 425,
      metadata_options: {type: 'attr', name: 'data-jmapping'}
    },
    makeGLatLng: function(place_point){
      return new GLatLng(place_point.lat, place_point.lng);
    }
  });
  
  $.fn.jMapping = function(options){
    if ((options == 'update') && $(this[0]).data('jMapping')){
      $(this[0]).data('jMapping').update();
    } else {
      if (options == 'update') options = {};
      $(this[0]).data('jMapping', $.jMapping(this[0], options));
    }
    return this;
  };
})(jQuery);
