import { request } from '@/services/api'
import { API_URLS } from '@/constants/apis'

export function listRestaurants({ latitude, longitude, cuisine = '', sortBy = 'rating' } = {}) {
  return request(API_URLS.RESTAURANTS, {
    query: { latitude, longitude, cuisine, sort_by: sortBy, radius_km: 10, limit: 20 }
  })
}

export function getRestaurantMenu(restaurantId) {
  return request(API_URLS.RESTAURANT_MENU, {
    params: { restaurantId }
  })
}
