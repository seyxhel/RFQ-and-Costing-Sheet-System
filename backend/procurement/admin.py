from django.contrib import admin
from .models import PurchaseOrder, POLineItem, ActualCost

admin.site.register(PurchaseOrder)
admin.site.register(POLineItem)
admin.site.register(ActualCost)
